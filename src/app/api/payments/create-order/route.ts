/**
 * /api/payments/create-order/route.ts
 * POST — create a Razorpay order or subscription for Pro upgrade
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/firebaseAdmin";
import {
  createOrder,
  createSubscription,
  buildCheckoutConfig,
  PLANS,
  type PlanKey,
} from "@/lib/payments/paymentService";
import { createSubscription as saveSubscription } from "@/lib/firebase/firestoreService";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit/rateLimiter";
import { captureError } from "@/lib/monitoring/monitoring";

export async function POST(request: NextRequest) {
  const rlResult = await rateLimit(request, "payment");
  if (!rlResult.success) {
    return NextResponse.json(
      { error: "Too many payment requests. Please wait." },
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
  const { planKey, type = "subscription" } = body as {
    planKey: PlanKey;
    type?: "order" | "subscription";
  };

  if (!PLANS[planKey]) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const plan = PLANS[planKey];

  try {
    if (type === "subscription") {
      const sub = await createSubscription({
        planKey,
        userId: decodedToken.uid,
        userEmail: decodedToken.email || "",
        userName: decodedToken.name || "User",
      });

      // Save to Firestore with pending status
      await saveSubscription(decodedToken.uid, planKey, sub.id, "");

      const config = buildCheckoutConfig({
        subscription: sub,
        planKey,
        userName: decodedToken.name || "",
        userEmail: decodedToken.email || "",
      });

      return NextResponse.json(
        { config, subscriptionId: sub.id },
        { headers: rateLimitHeaders(rlResult) }
      );
    } else {
      // One-time order (e.g., contest entry fee)
      const order = await createOrder({
        amount: plan.amount,
        receipt: `order_${decodedToken.uid}_${Date.now()}`,
        notes: {
          userId: decodedToken.uid,
          planKey,
          userEmail: decodedToken.email || "",
        },
      });

      const config = buildCheckoutConfig({
        order,
        planKey,
        userName: decodedToken.name || "",
        userEmail: decodedToken.email || "",
      });

      return NextResponse.json(
        { config, orderId: order.id },
        { headers: rateLimitHeaders(rlResult) }
      );
    }
  } catch (err) {
    captureError(err, { context: "create_payment_order", planKey });
    return NextResponse.json({ error: "Payment initialization failed." }, { status: 500 });
  }
}