/**
 * /api/teams/requests/route.ts
 * POST — send a team request
 * GET  — get pending requests for authenticated user
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/firebaseAdmin";
import {
  sendTeamRequest,
  getPendingTeamRequests,
  respondToTeamRequest,
} from "@/lib/firebase/firestoreService";
import {
  sendTeamRequestReceivedEmail,
  sendTeamRequestAcceptedEmail,
} from "@/lib/email/emailService";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit/rateLimiter";
import { captureError } from "@/lib/monitoring/monitoring";

export async function GET(request: NextRequest) {
  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await getPendingTeamRequests(decodedToken.uid);
  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const rlResult = await rateLimit(request, "teamRequest");
  if (!rlResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: rateLimitHeaders(rlResult) }
    );
  }

  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { toUserId, toUserEmail, toUserName, eventId, eventTitle, message } = body;

  if (!toUserId || !eventId || !eventTitle) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  if (toUserId === decodedToken.uid) {
    return NextResponse.json({ error: "You cannot send a request to yourself." }, { status: 400 });
  }

  try {
    const requestId = await sendTeamRequest({
      fromUserId: decodedToken.uid,
      fromUserName: decodedToken.name || "Anonymous",
      fromUserEmail: decodedToken.email || "",
      toUserId,
      toUserEmail,
      eventId,
      eventTitle,
      message,
    });

    // Send email notification to the recipient (non-blocking)
    void sendTeamRequestReceivedEmail({
      toEmail: toUserEmail,
      toName: toUserName || "Teammate",
      fromName: decodedToken.name || "A fellow coder",
      eventTitle,
      eventId,
      requestId,
      message,
    }).catch((err) => captureError(err, { context: "team_request_email" }));

    return NextResponse.json(
      { success: true, requestId },
      { status: 201, headers: rateLimitHeaders(rlResult) }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "REQUEST_ALREADY_SENT") {
      return NextResponse.json(
        { error: "You already have a pending request to this user for this event." },
        { status: 409 }
      );
    }
    captureError(err, { context: "send_team_request" });
    return NextResponse.json({ error: "Failed to send request." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requestId, action, requesterEmail, requesterName, eventTitle, eventId, teamId } = body;

  if (!requestId || !["accepted", "rejected"].includes(action)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    await respondToTeamRequest(requestId, decodedToken.uid, action);

    if (action === "accepted" && requesterEmail) {
      void sendTeamRequestAcceptedEmail({
        toEmail: requesterEmail,
        toName: requesterName || "Teammate",
        acceptorName: decodedToken.name || "Your new teammate",
        eventTitle: eventTitle || "the event",
        eventId: eventId || "",
        teamId: teamId || "",
      }).catch((err) => captureError(err, { context: "team_accept_email" }));
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "REQUEST_NOT_FOUND") return NextResponse.json({ error: "Request not found." }, { status: 404 });
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (msg === "REQUEST_ALREADY_HANDLED") return NextResponse.json({ error: "Already handled." }, { status: 409 });
    captureError(err, { context: "respond_team_request" });
    return NextResponse.json({ error: "Failed to respond." }, { status: 500 });
  }
}