/**
 * paymentService.ts — Razorpay integration.
 * Handles order creation, subscription lifecycle, and webhook validation.
 *
 * Setup: npm install razorpay
 */

import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start?: number;
  current_end?: number;
  charge_at?: number;
  paid_count: number;
  total_count: number;
}

export interface PaymentVerificationResult {
  valid: boolean;
  orderId: string;
  paymentId: string;
  signature: string;
}

export interface WebhookEvent {
  entity: string;
  account_id: string;
  event:
    | "payment.captured"
    | "payment.failed"
    | "subscription.activated"
    | "subscription.charged"
    | "subscription.completed"
    | "subscription.cancelled"
    | "subscription.halted";
  payload: {
    payment?: { entity: RazorpayPayment };
    subscription?: { entity: RazorpaySubscription };
  };
  created_at: number;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  notes?: Record<string, string>;
  subscription_id?: string;
}

// ─── Plan Config ──────────────────────────────────────────────────────────────

export const PLANS = {
  pro_monthly: {
    id: process.env.RAZORPAY_PLAN_PRO_MONTHLY || "plan_pro_monthly",
    name: "Uni-O Pro Monthly",
    amount: 49900, // ₹499 in paise
    currency: "INR",
    period: "monthly" as const,
    interval: 1,
    features: [
      "Unlimited challenge attempts",
      "Premium editorial access",
      "Priority contest registration",
      "Team collaboration tools",
      "Analytics dashboard",
    ],
  },
  pro_annual: {
    id: process.env.RAZORPAY_PLAN_PRO_ANNUAL || "plan_pro_annual",
    name: "Uni-O Pro Annual",
    amount: 399900, // ₹3,999 in paise
    currency: "INR",
    period: "yearly" as const,
    interval: 1,
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to new features",
      "Dedicated support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─── Razorpay Client ──────────────────────────────────────────────────────────

function getRazorpay() {
  const Razorpay = require("razorpay"); // eslint-disable-line @typescript-eslint/no-var-requires
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ─── Order Management ─────────────────────────────────────────────────────────

export async function createOrder(params: {
  amount: number; // in paise
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const razorpay = getRazorpay();
  const order = await razorpay.orders.create({
    amount: params.amount,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes || {},
  });
  return order as RazorpayOrder;
}

export async function getOrder(orderId: string): Promise<RazorpayOrder> {
  const razorpay = getRazorpay();
  return razorpay.orders.fetch(orderId) as Promise<RazorpayOrder>;
}

// ─── Subscription Management ──────────────────────────────────────────────────

export async function createSubscription(params: {
  planKey: PlanKey;
  userId: string;
  userEmail: string;
  userName: string;
  totalCount?: number;
}): Promise<RazorpaySubscription> {
  const razorpay = getRazorpay();
  const plan = PLANS[params.planKey];

  const sub = await razorpay.subscriptions.create({
    plan_id: plan.id,
    total_count: params.totalCount || 12,
    quantity: 1,
    customer_notify: 1,
    notes: {
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      planKey: params.planKey,
    },
  });

  return sub as RazorpaySubscription;
}

export async function cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<void> {
  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(subscriptionId, { cancel_at_cycle_end: 1 });
}

export async function cancelSubscriptionImmediately(subscriptionId: string): Promise<void> {
  const razorpay = getRazorpay();
  await razorpay.subscriptions.cancel(subscriptionId, { cancel_at_cycle_end: 0 });
}

export async function getSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
  const razorpay = getRazorpay();
  return razorpay.subscriptions.fetch(subscriptionId) as Promise<RazorpaySubscription>;
}

// ─── Payment Verification ─────────────────────────────────────────────────────

/**
 * Verify Razorpay payment signature (client-side callback verification).
 * Call this on the server after receiving razorpay_payment_id and razorpay_signature.
 */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): PaymentVerificationResult {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET not set");

  const body = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return {
    valid: expectedSignature === params.signature,
    ...params,
  };
}

/**
 * Verify Razorpay webhook signature.
 * Pass the raw request body (Buffer) and the x-razorpay-signature header.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not set");

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, "hex"),
    Buffer.from(signature, "hex")
  );
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export async function issueRefund(params: {
  paymentId: string;
  amount?: number; // partial refund in paise; omit for full refund
  reason?: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; status: string }> {
  const razorpay = getRazorpay();
  const refundParams: Record<string, unknown> = {
    notes: { reason: params.reason || "Customer request", ...params.notes },
  };
  if (params.amount) refundParams.amount = params.amount;

  return razorpay.payments.refund(params.paymentId, refundParams);
}

// ─── Razorpay Checkout Config ─────────────────────────────────────────────────

export interface CheckoutConfig {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  subscription_id?: string;
  prefill: { name: string; email: string; contact?: string };
  notes?: Record<string, string>;
  theme: { color: string };
  handler_url: string; // webhook/callback URL
}

export function buildCheckoutConfig(params: {
  order?: RazorpayOrder;
  subscription?: RazorpaySubscription;
  planKey?: PlanKey;
  userName: string;
  userEmail: string;
  userPhone?: string;
}): CheckoutConfig {
  const plan = params.planKey ? PLANS[params.planKey] : null;

  return {
    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    amount: params.order?.amount || plan?.amount || 0,
    currency: "INR",
    name: "Uni-O",
    description: plan?.name || "Uni-O Payment",
    order_id: params.order?.id || "",
    subscription_id: params.subscription?.id,
    prefill: {
      name: params.userName,
      email: params.userEmail,
      contact: params.userPhone,
    },
    theme: { color: "#6C3BFF" },
    handler_url: `${process.env.NEXTAUTH_URL}/api/payments/verify`,
  };
}

// ─── Amount Helpers ───────────────────────────────────────────────────────────

export const inPaise = (rupees: number) => Math.round(rupees * 100);
export const inRupees = (paise: number) => paise / 100;
export const formatINR = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    paise / 100
  );