import * as functions from 'firebase-functions/v1';
import { admin, db } from './admin';

// ─── Stripe Payment & Subscription Flow ──────────────────────────────────────
// Requires: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, APP_BASE_URL in env

const PLANS = {
  monthly: { priceInPaise: 29900, name: 'Monthly', durationDays: 30 },
  quarterly: { priceInPaise: 74900, name: 'Quarterly', durationDays: 90 },
  yearly: { priceInPaise: 249900, name: 'Yearly', durationDays: 365 },
} as const;

type PlanKey = keyof typeof PLANS;

function getStripeConfig() {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    baseUrl: process.env.APP_BASE_URL || 'https://unio.app',
  };
}

async function stripeRequest(
  endpoint: string,
  method: string,
  body?: Record<string, string>
): Promise<Record<string, unknown>> {
  const { secretKey } = getStripeConfig();
  if (!secretKey) throw new functions.https.HttpsError('unavailable', 'Stripe not configured');

  const res = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    functions.logger.error('Stripe API error', { endpoint, status: res.status, data });
    throw new functions.https.HttpsError('internal', `Stripe error: ${(data.error as Record<string, unknown>)?.message ?? res.status}`);
  }
  return data;
}

// ─── Create Checkout Session ─────────────────────────────────────────────────

export const createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const plan = String(data?.plan ?? '') as PlanKey;
  if (!PLANS[plan]) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${plan}. Valid: ${Object.keys(PLANS).join(', ')}`);
  }

  const userId = context.auth.uid;
  const userSnap = await db.collection('users').doc(userId).get();
  const userData = userSnap.data();
  const email = userData?.email as string || '';

  const { baseUrl } = getStripeConfig();
  const planInfo = PLANS[plan];

  // Create or retrieve Stripe customer
  let stripeCustomerId = userData?.stripeCustomerId as string | undefined;
  if (!stripeCustomerId) {
    const customer = await stripeRequest('/customers', 'POST', {
      email,
      'metadata[firebaseUid]': userId,
      name: (userData?.displayName as string) || '',
    });
    stripeCustomerId = customer.id as string;
    await db.collection('users').doc(userId).update({ stripeCustomerId });
  }

  // Create Checkout session
  const session = await stripeRequest('/checkout/sessions', 'POST', {
    customer: stripeCustomerId,
    'payment_method_types[0]': 'card',
    'line_items[0][price_data][currency]': 'inr',
    'line_items[0][price_data][product_data][name]': `Unio Premium ${planInfo.name}`,
    'line_items[0][price_data][product_data][description]': `${planInfo.name} premium subscription`,
    'line_items[0][price_data][unit_amount]': String(planInfo.priceInPaise),
    'line_items[0][quantity]': '1',
    mode: 'payment',
    success_url: `${baseUrl}/profile?payment=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/profile?payment=cancelled`,
    'metadata[userId]': userId,
    'metadata[plan]': plan,
    'metadata[durationDays]': String(planInfo.durationDays),
  });

  return { sessionId: session.id, url: session.url };
});

// ─── Razorpay Create Order (alternative) ────────────────────────────────────

export const createRazorpayOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!razorpayKeyId || !razorpayKeySecret) {
    throw new functions.https.HttpsError('unavailable', 'Razorpay not configured');
  }

  const plan = String(data?.plan ?? '') as PlanKey;
  if (!PLANS[plan]) {
    throw new functions.https.HttpsError('invalid-argument', `Invalid plan: ${plan}`);
  }

  const userId = context.auth.uid;
  const planInfo = PLANS[plan];
  const receipt = `unio_${userId}_${Date.now()}`;

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: planInfo.priceInPaise,
      currency: 'INR',
      receipt,
      notes: { userId, plan, durationDays: planInfo.durationDays },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    functions.logger.error('Razorpay order creation failed', { err });
    throw new functions.https.HttpsError('internal', 'Failed to create order');
  }

  const order = await res.json() as Record<string, unknown>;

  // Save pending order
  await db.collection('orders').doc(order.id as string).set({
    orderId: order.id,
    userId,
    plan,
    amount: planInfo.priceInPaise,
    currency: 'INR',
    provider: 'razorpay',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { orderId: order.id, amount: planInfo.priceInPaise, currency: 'INR', keyId: razorpayKeyId };
});

// ─── Verify Razorpay Payment ────────────────────────────────────────────────

export const verifyRazorpayPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  if (!razorpayKeySecret) {
    throw new functions.https.HttpsError('unavailable', 'Razorpay not configured');
  }

  const orderId = String(data?.orderId ?? '');
  const paymentId = String(data?.paymentId ?? '');
  const signature = String(data?.signature ?? '');

  if (!orderId || !paymentId || !signature) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId, paymentId, signature required');
  }

  // Verify signature server-side using HMAC
  const crypto = await import('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', razorpayKeySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  if (expectedSignature !== signature) {
    functions.logger.error('Razorpay signature mismatch', { orderId, paymentId });
    throw new functions.https.HttpsError('permission-denied', 'Invalid payment signature');
  }

  // Fetch order to get plan details
  const orderSnap = await db.collection('orders').doc(orderId).get();
  const orderData = orderSnap.data();
  if (!orderData) {
    throw new functions.https.HttpsError('not-found', 'Order not found');
  }

  const userId = context.auth.uid;
  if (orderData.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Order does not belong to this user');
  }

  const plan = orderData.plan as PlanKey;
  const planInfo = PLANS[plan];

  await activateSubscription(userId, plan, planInfo.durationDays, 'razorpay', paymentId);

  // Update order status
  await db.collection('orders').doc(orderId).update({
    status: 'completed',
    paymentId,
    completedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

// ─── Stripe Webhook ──────────────────────────────────────────────────────────

export const stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const { webhookSecret, secretKey } = getStripeConfig();
  if (!secretKey || !webhookSecret) {
    res.status(503).send('Stripe not configured');
    return;
  }

  // Verify webhook signature
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    res.status(400).send('Missing signature');
    return;
  }

  const crypto = await import('crypto');
  const payload = (req as unknown as { rawBody: Buffer }).rawBody;
  const elements = sig.split(',');
  const timestamp = elements.find(e => e.startsWith('t='))?.split('=')[1];
  const v1Signature = elements.find(e => e.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !v1Signature) {
    res.status(400).send('Invalid signature format');
    return;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(signedPayload)
    .digest('hex');

  if (expectedSignature !== v1Signature) {
    res.status(400).send('Signature verification failed');
    return;
  }

  try {
    const event = JSON.parse(payload.toString()) as Record<string, unknown>;
    const eventType = event.type as string;

    if (eventType === 'checkout.session.completed') {
      const session = (event.data as Record<string, unknown>).object as Record<string, unknown>;
      const metadata = session.metadata as Record<string, string>;
      const userId = metadata.userId;
      const plan = metadata.plan as PlanKey;
      const durationDays = parseInt(metadata.durationDays, 10);
      const paymentIntent = session.payment_intent as string;

      if (userId && plan) {
        await activateSubscription(userId, plan, durationDays, 'stripe', paymentIntent);
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    functions.logger.error('Stripe webhook processing error', { err });
    res.status(500).send('Webhook processing failed');
  }
});

// ─── Subscription Lifecycle ──────────────────────────────────────────────────

async function activateSubscription(
  userId: string,
  plan: PlanKey,
  durationDays: number,
  provider: 'stripe' | 'razorpay',
  paymentRef: string
): Promise<void> {
  const now = new Date();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);

  const subscriptionRef = db.collection('subscriptions').doc();
  const batch = db.batch();

  // Create subscription record
  batch.set(subscriptionRef, {
    userId,
    plan,
    provider,
    paymentRef,
    status: 'active',
    startDate: admin.firestore.FieldValue.serverTimestamp(),
    endDate: endTimestamp,
    autoRenew: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Update user premium status
  batch.update(db.collection('users').doc(userId), {
    isPremium: true,
    premiumExpiresAt: endTimestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Send confirmation email
  const userSnap = await db.collection('users').doc(userId).get();
  const userData = userSnap.data();
  if (userData?.email) {
    const { sendSubscriptionConfirmEmail } = await import('./email');
    await sendSubscriptionConfirmEmail(
      userData.email as string,
      (userData.displayName as string) || 'User',
      PLANS[plan].name,
      endDate.toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    );
  }

  // Create notification
  await db.collection('users').doc(userId).collection('notifications').add({
    type: 'subscription',
    title: 'Premium Activated! ⚡',
    message: `Your ${PLANS[plan].name} premium subscription is now active.`,
    link: '/profile',
    isRead: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info('Subscription activated', { userId, plan, provider, endDate: endDate.toISOString() });
}

// ─── Cancel Subscription ────────────────────────────────────────────────────

export const cancelSubscription = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const userId = context.auth.uid;
  const subscriptionId = String(data?.subscriptionId ?? '');

  const subSnap = subscriptionId
    ? await db.collection('subscriptions').doc(subscriptionId).get()
    : (await db.collection('subscriptions')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()).docs[0] ?? null;

  if (!subSnap || (subSnap instanceof Object && 'exists' in subSnap && !subSnap.exists)) {
    throw new functions.https.HttpsError('not-found', 'No active subscription found');
  }

  const subData = typeof subSnap.data === 'function' ? subSnap.data() : null;
  if (!subData || subData.userId !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Not your subscription');
  }

  const subRef = typeof subSnap.ref !== 'undefined' ? subSnap.ref : db.collection('subscriptions').doc(subscriptionId);

  // Mark as cancelled — access continues until endDate
  await subRef.update({
    autoRenew: false,
    status: 'cancelled',
    cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, message: 'Subscription cancelled. Access continues until the end of your billing period.' };
});

// ─── Get User Subscription Status ───────────────────────────────────────────

export const getSubscriptionStatus = functions.https.onCall(async (_data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const userId = context.auth.uid;
  const subsSnap = await db.collection('subscriptions')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (subsSnap.empty) {
    return { isPremium: false, subscription: null };
  }

  const sub = subsSnap.docs[0].data();
  return {
    isPremium: sub.status === 'active',
    subscription: {
      id: subsSnap.docs[0].id,
      plan: sub.plan,
      status: sub.status,
      startDate: sub.startDate?.toDate?.()?.toISOString() ?? null,
      endDate: sub.endDate?.toDate?.()?.toISOString() ?? null,
      autoRenew: sub.autoRenew,
      provider: sub.provider,
    },
  };
});
