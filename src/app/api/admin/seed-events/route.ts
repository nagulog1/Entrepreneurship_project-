import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { EVENTS } from "@/lib/data/events";
import { FieldValue } from "firebase-admin/firestore";

export async function POST() {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not initialised — check server env vars." },
      { status: 500 }
    );
  }

  const BATCH_LIMIT = 450;
  const col = adminDb.collection("events");

  let batch = adminDb.batch();
  let ops = 0;
  let total = 0;
  const baseTime = Date.now();

  for (let i = 0; i < EVENTS.length; i++) {
    const event = EVENTS[i];
    const ref = col.doc(event.id);

    // Give each event a slightly different createdAt so ordering is stable.
    // Earlier index → earlier time so "event-1" appears first.
    const createdAt = FieldValue.serverTimestamp();
    void createdAt; // not used directly — use numeric offset via a Date string

    batch.set(
      ref,
      {
        ...event,
        registrationCount: event.registered ?? 0,
        isFeatured: event.featured ?? false,
        status: "upcoming",
        createdAt: new Date(baseTime - (EVENTS.length - i) * 1000),
        updatedAt: new Date(baseTime),
      },
      { merge: true }
    );

    ops += 1;

    if (ops >= BATCH_LIMIT) {
      await batch.commit();
      total += ops;
      batch = adminDb.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    total += ops;
  }

  return NextResponse.json({ ok: true, seeded: total });
}
