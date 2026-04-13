/**
 * /api/events/[eventId]/register/route.ts
 * POST - register user for event, stores in Firestore, sends email
 * DELETE - cancel registration
 * GET - get user's registrations
 */

import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/monitoring/monitoring";

interface Context { params: { eventId: string } }

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getAdminFirestore() {
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
      throw new Error("Firebase Admin not configured");
    }
    initializeApp({ credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    })});
  }

  return getFirestore();
}

async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const { getApps, initializeApp, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (!getApps().length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    initializeApp({ credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey:  privateKey!,
    })});
  }

  return getAuth().verifyIdToken(authHeader.slice(7));
}

// ── POST /api/events/[eventId]/register ───────────────────────────────────────

export async function POST(request: NextRequest, { params }: Context) {
  let decoded: Awaited<ReturnType<typeof verifyToken>>;
  try {
    decoded = await verifyToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { teamId?: string; teamName?: string } = {};
  try { body = await request.json() as typeof body; } catch { /* optional body */ }

  try {
    const db = await getAdminFirestore();
    const { FieldValue } = await import("firebase-admin/firestore");

    const registrationId = `${decoded.uid}_${params.eventId}`;
    const regRef  = db.collection("registrations").doc(registrationId);
    const eventRef = db.collection("events").doc(params.eventId);

    // Use transaction to prevent double registration
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(regRef);
      if (existing.exists) throw new Error("ALREADY_REGISTERED");

      const eventSnap = await tx.get(eventRef);

      tx.set(regRef, {
        eventId:    params.eventId,
        userId:     decoded.uid,
        userName:   decoded.name  || "Anonymous",
        userEmail:  decoded.email || "",
        teamId:     body.teamId   || null,
        teamName:   body.teamName || null,
        status:     "confirmed",
        registeredAt: FieldValue.serverTimestamp(),
      });

      if (eventSnap.exists) {
        tx.update(eventRef, { registered: FieldValue.increment(1) });
      }
    });

    // Send confirmation email (non-blocking)
    if (decoded.email) {
      const { sendEventRegistrationEmail } = await import("@/lib/email/emailService");
      void sendEventRegistrationEmail({
        userEmail: decoded.email,
        userName:  decoded.name || "Participant",
        eventTitle: params.eventId,
        eventDate:  new Date().toLocaleDateString("en-IN"),
        eventId:    params.eventId,
        eventMode:  "Online",
        teamName:   body.teamName,
      }).catch((err) => captureError(err, { context: "reg_email" }));
    }

    return NextResponse.json({ success: true, registrationId }, { status: 201 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "ALREADY_REGISTERED") {
      return NextResponse.json({ error: "You are already registered for this event." }, { status: 409 });
    }
    captureError(err, { context: "event_registration", eventId: params.eventId });
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}

// ── DELETE /api/events/[eventId]/register ─────────────────────────────────────

export async function DELETE(request: NextRequest, { params }: Context) {
  let decoded: Awaited<ReturnType<typeof verifyToken>>;
  try {
    decoded = await verifyToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getAdminFirestore();
    const { FieldValue } = await import("firebase-admin/firestore");
    const regRef   = db.collection("registrations").doc(`${decoded.uid}_${params.eventId}`);
    const eventRef = db.collection("events").doc(params.eventId);

    await db.runTransaction(async (tx) => {
      const reg = await tx.get(regRef);
      if (!reg.exists) throw new Error("NOT_FOUND");
      tx.delete(regRef);
      tx.update(eventRef, { registered: FieldValue.increment(-1) });
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    captureError(err, { context: "cancel_registration" });
    return NextResponse.json({ error: "Cancellation failed." }, { status: 500 });
  }
}

// ── GET /api/events/[eventId]/register ────────────────────────────────────────

export async function GET(request: NextRequest) {
  let decoded: Awaited<ReturnType<typeof verifyToken>>;
  try {
    decoded = await verifyToken(request.headers.get("authorization"));
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = await getAdminFirestore();
    const snap = await db.collection("registrations")
      .where("userId", "==", decoded.uid)
      .orderBy("registeredAt", "desc")
      .get();

    const registrations = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ registrations });
  } catch (err) {
    captureError(err, { context: "get_registrations" });
    return NextResponse.json({ error: "Failed to fetch registrations." }, { status: 500 });
  }
}