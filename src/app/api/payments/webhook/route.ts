/**
 * /api/payments/webhook/route.ts
 * POST — Razorpay webhook endpoint
 * Verifies signature, processes subscription events, updates Firestore, sends emails.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  type WebhookEvent,
} from "@/lib/payments/paymentService";
import {
  activateSubscription,
  cancelSubscription,
  getAdminDb,
} from "@/lib/firebase/firebaseAdmin";
import {
  sendSubscriptionConfirmedEmail,
  sendPaymentReceiptEmail,
} from "@/lib/email/emailService";
import { captureError, createLogger } from "@/lib/monitoring/monitoring";
import { serverTimestamp } from "firebase-admin/firestore";

// Import admin db directly on server
async function getDb() {
  const { getAdminDb } = await import("@/lib/firebase/firebaseAdmin");
  return getAdminDb();
}

// Import admin activate/cancel
async function activateSub(userId: string, paymentId: string) {
  const { activateSubscription } = await import("@/lib/firebase/firestoreService");
  return activateSubscription(userId, paymentId);
}

async function cancelSub(userId: string) {
  const { cancelSubscription } = await import("@/lib/firebase/firestoreService");
  return cancelSubscription(userId);
}

const logger = createLogger("webhook:razorpay");

// Must disable body parsing to get raw bytes for signature verification
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1. Get raw body for signature verification
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  // 2. Verify webhook signature
  let isValid: boolean;
  try {
    isValid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    logger.error("Webhook signature verification error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isValid) {
    logger.warn("Invalid webhook signature received");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse event
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody.toString()) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  logger.info("Webhook received", { event: event.event });

  // 4. Idempotency — check if this event was already processed
  const db = await getDb();
  const eventRef = db.collection("webhookEvents").doc(`razorpay_${event.created_at}_${event.event}`);
  const existing = await eventRef.get();
  if (existing.exists) {
    logger.info("Duplicate webhook event, skipping", { event: event.event });
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Mark as processing
  await eventRef.set({
    event: event.event,
    processedAt: serverTimestamp(),
    payload: JSON.parse(rawBody.toString()),
  });

  // 5. Handle event types
  try {
    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;

        const userId = payment.notes?.userId;
        if (!userId) {
          logger.warn("payment.captured without userId in notes", { paymentId: payment.id });
          break;
        }

        await activateSub(userId, payment.id);

        // Get user info for email
        const userSnap = await db.collection("users").doc(userId).get();
        const userData = userSnap.data();
        if (userData?.email) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);

          await Promise.all([
            sendSubscriptionConfirmedEmail({
              userEmail: userData.email,
              userName: userData.name || "User",
              plan: "Pro",
              amount: payment.amount / 100,
              expiresAt,
              paymentId: payment.id,
            }),
            sendPaymentReceiptEmail({
              userEmail: userData.email,
              userName: userData.name || "User",
              amount: payment.amount / 100,
              currency: "INR",
              paymentId: payment.id,
              description: "Uni-O Pro Subscription",
              paidAt: new Date(),
            }),
          ]);
        }
        break;
      }

      case "payment.failed": {
        const payment = event.payload.payment?.entity;
        if (!payment) break;
        logger.warn("Payment failed", { paymentId: payment.id, notes: payment.notes });

        // Update subscription status to failed
        const userId = payment.notes?.userId;
        if (userId) {
          await db.collection("subscriptions").doc(userId).update({
            status: "payment_failed",
            lastPaymentFailedAt: serverTimestamp(),
          });
        }
        break;
      }

      case "subscription.activated": {
        const sub = event.payload.subscription?.entity;
        logger.info("Subscription activated", { subscriptionId: sub?.id });
        break;
      }

      case "subscription.charged": {
        const sub = event.payload.subscription?.entity;
        const payment = event.payload.payment?.entity;
        logger.info("Subscription charged", {
          subscriptionId: sub?.id,
          paymentId: payment?.id,
        });
        // Extend subscription period
        if (payment?.notes?.userId) {
          await activateSub(payment.notes.userId, payment.id);
        }
        break;
      }

      case "subscription.cancelled": {
        const sub = event.payload.subscription?.entity;
        logger.info("Subscription cancelled", { subscriptionId: sub?.id });

        // Find user by subscription ID
        const subscriptionsSnap = await db
          .collection("subscriptions")
          .where("razorpaySubscriptionId", "==", sub?.id)
          .limit(1)
          .get();

        if (!subscriptionsSnap.empty) {
          const userId = subscriptionsSnap.docs[0].id;
          await cancelSub(userId);
        }
        break;
      }

      case "subscription.halted": {
        logger.warn("Subscription halted", { subscriptionId: event.payload.subscription?.entity?.id });
        // Send notification email to user
        break;
      }

      default:
        logger.info("Unhandled webhook event type", { event: event.event });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { context: "webhook_handler", event: event.event });
    logger.error("Webhook handler error", err);
    // Return 200 to prevent Razorpay retrying (we'll handle it manually)
    return NextResponse.json({ ok: false, error: "Handler error" });
  }
}