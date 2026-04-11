/**
 * /api/events/[eventId]/register/route.ts
 * POST — register authenticated user for an event
 * DELETE — cancel registration
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/firebaseAdmin";
import {
  registerForEvent,
  cancelRegistration,
  getUserRegistrations,
} from "@/lib/firebase/firestoreService";
import { sendEventRegistrationEmail } from "@/lib/email/emailService";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit/rateLimiter";
import { captureError } from "@/lib/monitoring/monitoring";

interface Context {
  params: { eventId: string };
}

export async function POST(request: NextRequest, { params }: Context) {
  // 1. Rate limit
  const rlResult = await rateLimit(request, "register");
  if (!rlResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before registering again." },
      { status: 429, headers: rateLimitHeaders(rlResult) }
    );
  }

  // 2. Auth
  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse body
  let body: { teamId?: string; teamName?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  // 4. Register
  try {
    const registration = await registerForEvent({
      eventId: params.eventId,
      userId: decodedToken.uid,
      userName: decodedToken.name || "Anonymous",
      userEmail: decodedToken.email || "",
      teamId: body.teamId,
      teamName: body.teamName,
    });

    // 5. Send confirmation email (non-blocking)
    void sendEventRegistrationEmail({
      userEmail: decodedToken.email || "",
      userName: decodedToken.name || "Participant",
      eventTitle: registration.eventId, // ideally fetch event title
      eventDate: new Date().toLocaleDateString("en-IN"),
      eventId: params.eventId,
      eventMode: "Online",
      teamName: body.teamName,
    }).catch((err) => captureError(err, { context: "registration_email" }));

    return NextResponse.json(
      { success: true, registration },
      { status: 201, headers: rateLimitHeaders(rlResult) }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "ALREADY_REGISTERED") {
      return NextResponse.json(
        { error: "You are already registered for this event." },
        { status: 409 }
      );
    }
    if (message === "EVENT_FULL") {
      return NextResponse.json(
        { error: "This event has reached its maximum capacity." },
        { status: 410 }
      );
    }
    if (message === "EVENT_NOT_FOUND") {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    captureError(err, { context: "event_registration", eventId: params.eventId });
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await cancelRegistration(decodedToken.uid, params.eventId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "";
    if (message === "REGISTRATION_NOT_FOUND") {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }
    captureError(err, { context: "cancel_registration" });
    return NextResponse.json({ error: "Cancellation failed." }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  let decodedToken: Awaited<ReturnType<typeof verifyIdToken>>;
  try {
    decodedToken = await verifyIdToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const registrations = await getUserRegistrations(decodedToken.uid);
  return NextResponse.json({ registrations });
}