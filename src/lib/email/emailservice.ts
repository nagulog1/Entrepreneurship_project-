/**
 * emailService.ts — Production email service using SendGrid.
 * Handles transactional emails (registration, team requests, welcome)
 * and supports bulk marketing sends via dynamic templates.
 *
 * Setup: npm install @sendgrid/mail @sendgrid/client
 */

import sgMail from "@sendgrid/mail";
import sgClient from "@sendgrid/client";

// ─── Init ─────────────────────────────────────────────────────────────────────

let initialized = false;

/** Returns false when SendGrid is not configured — callers log and skip. */
function ensureInit(): boolean {
  if (initialized) return true;
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    // Dev mode: log to console instead of sending
    return false;
  }
  sgMail.setApiKey(apiKey);
  sgClient.setApiKey(apiKey);
  initialized = true;
  return true;
}

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || "noreply@uni-o.in",
  name: "Uni-O Platform",
};

// ─── Template IDs (create these in SendGrid dashboard) ────────────────────────

const TEMPLATES = {
  WELCOME:              process.env.SG_TEMPLATE_WELCOME              || "d-welcome",
  EVENT_REGISTRATION:   process.env.SG_TEMPLATE_EVENT_REGISTRATION   || "d-event-reg",
  TEAM_REQUEST_SENT:    process.env.SG_TEMPLATE_TEAM_REQUEST_SENT    || "d-team-req-sent",
  TEAM_REQUEST_RECEIVED:process.env.SG_TEMPLATE_TEAM_REQUEST_RECEIVED|| "d-team-req-recv",
  TEAM_REQUEST_ACCEPTED:process.env.SG_TEMPLATE_TEAM_REQUEST_ACCEPTED|| "d-team-req-accept",
  CONTEST_REMINDER:     process.env.SG_TEMPLATE_CONTEST_REMINDER     || "d-contest-reminder",
  SUBSCRIPTION_CONFIRM: process.env.SG_TEMPLATE_SUBSCRIPTION_CONFIRM || "d-sub-confirm",
  SUBSCRIPTION_CANCEL:  process.env.SG_TEMPLATE_SUBSCRIPTION_CANCEL  || "d-sub-cancel",
  PAYMENT_RECEIPT:      process.env.SG_TEMPLATE_PAYMENT_RECEIPT      || "d-payment-receipt",
  NEWSLETTER:           process.env.SG_TEMPLATE_NEWSLETTER           || "d-newsletter",
} as const;

// ─── Core Send Helpers ────────────────────────────────────────────────────────

interface SendOptions {
  to: string | { email: string; name?: string };
  templateId: string;
  dynamicData: Record<string, unknown>;
  replyTo?: string;
  attachments?: Array<{ content: string; filename: string; type: string }>;
}

async function sendTemplate(opts: SendOptions): Promise<void> {
  const ready = ensureInit();
  if (!ready) {
    // SendGrid not configured — log to console in dev mode
    console.info('[emailService] DEV MODE — would send email:', {
      to: opts.to,
      templateId: opts.templateId,
      data: opts.dynamicData,
    });
    return;
  }

  const msg: Parameters<typeof sgMail.send>[0] = {
    to: opts.to,
    from: FROM,
    templateId: opts.templateId,
    dynamicTemplateData: {
      ...opts.dynamicData,
      // Always inject platform metadata
      platformName: "Uni-O",
      platformUrl: process.env.NEXTAUTH_URL || "https://uni-o.in",
      currentYear: new Date().getFullYear(),
      supportEmail: "support@uni-o.in",
    },
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts.attachments ? { attachments: opts.attachments } : {}),
  };

  try {
    await sgMail.send(msg);
  } catch (err: unknown) {
    const sgErr = err as { response?: { body?: unknown } };
    console.error("[emailService] SendGrid error:", sgErr?.response?.body ?? err);
    throw new Error(`Email send failed: ${String(err)}`);
  }
}

// ─── Transactional Email Functions ────────────────────────────────────────────

export async function sendWelcomeEmail(user: {
  email: string;
  name: string;
}): Promise<void> {
  await sendTemplate({
    to: { email: user.email, name: user.name },
    templateId: TEMPLATES.WELCOME,
    dynamicData: {
      userName: user.name,
      dashboardUrl: `${process.env.NEXTAUTH_URL}/dashboard`,
      challengesUrl: `${process.env.NEXTAUTH_URL}/challenges`,
    },
  });
}

export async function sendEventRegistrationEmail(params: {
  userEmail: string;
  userName: string;
  eventTitle: string;
  eventDate: string;
  eventId: string;
  eventMode: string;
  teamName?: string;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.userEmail, name: params.userName },
    templateId: TEMPLATES.EVENT_REGISTRATION,
    dynamicData: {
      userName: params.userName,
      eventTitle: params.eventTitle,
      eventDate: params.eventDate,
      eventMode: params.eventMode,
      teamName: params.teamName ?? "Individual",
      eventUrl: `${process.env.NEXTAUTH_URL}/events/${params.eventId}`,
      calendarUrl: generateCalendarUrl(params.eventTitle, params.eventDate, params.eventId),
    },
  });
}

export async function sendTeamRequestReceivedEmail(params: {
  toEmail: string;
  toName: string;
  fromName: string;
  eventTitle: string;
  eventId: string;
  requestId: string;
  message?: string;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.toEmail, name: params.toName },
    templateId: TEMPLATES.TEAM_REQUEST_RECEIVED,
    dynamicData: {
      recipientName: params.toName,
      senderName: params.fromName,
      eventTitle: params.eventTitle,
      message: params.message || "Would you like to join my team?",
      acceptUrl: `${process.env.NEXTAUTH_URL}/teams/requests/${params.requestId}?action=accept`,
      rejectUrl: `${process.env.NEXTAUTH_URL}/teams/requests/${params.requestId}?action=reject`,
      eventUrl: `${process.env.NEXTAUTH_URL}/events/${params.eventId}`,
    },
  });
}

export async function sendTeamRequestAcceptedEmail(params: {
  toEmail: string;
  toName: string;
  acceptorName: string;
  eventTitle: string;
  eventId: string;
  teamId: string;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.toEmail, name: params.toName },
    templateId: TEMPLATES.TEAM_REQUEST_ACCEPTED,
    dynamicData: {
      requesterName: params.toName,
      acceptorName: params.acceptorName,
      eventTitle: params.eventTitle,
      teamUrl: `${process.env.NEXTAUTH_URL}/teams/${params.teamId}`,
      eventUrl: `${process.env.NEXTAUTH_URL}/events/${params.eventId}`,
    },
  });
}

export async function sendContestReminderEmail(params: {
  userEmail: string;
  userName: string;
  contestTitle: string;
  contestId: string;
  startsAt: Date;
  minutesBefore: number;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.userEmail, name: params.userName },
    templateId: TEMPLATES.CONTEST_REMINDER,
    dynamicData: {
      userName: params.userName,
      contestTitle: params.contestTitle,
      minutesBefore: params.minutesBefore,
      startsAt: params.startsAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      joinUrl: `${process.env.NEXTAUTH_URL}/contests/${params.contestId}`,
    },
  });
}

export async function sendSubscriptionConfirmedEmail(params: {
  userEmail: string;
  userName: string;
  plan: string;
  amount: number;
  expiresAt: Date;
  paymentId: string;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.userEmail, name: params.userName },
    templateId: TEMPLATES.SUBSCRIPTION_CONFIRM,
    dynamicData: {
      userName: params.userName,
      plan: params.plan,
      amount: `₹${params.amount.toLocaleString("en-IN")}`,
      expiresAt: params.expiresAt.toLocaleDateString("en-IN"),
      paymentId: params.paymentId,
      dashboardUrl: `${process.env.NEXTAUTH_URL}/settings/subscription`,
    },
  });
}

export async function sendPaymentReceiptEmail(params: {
  userEmail: string;
  userName: string;
  amount: number;
  currency: string;
  paymentId: string;
  description: string;
  paidAt: Date;
}): Promise<void> {
  await sendTemplate({
    to: { email: params.userEmail, name: params.userName },
    templateId: TEMPLATES.PAYMENT_RECEIPT,
    dynamicData: {
      userName: params.userName,
      amount: `${params.currency} ${params.amount.toLocaleString("en-IN")}`,
      paymentId: params.paymentId,
      description: params.description,
      paidAt: params.paidAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      invoiceUrl: `${process.env.NEXTAUTH_URL}/api/receipts/${params.paymentId}`,
    },
  });
}

// ─── Bulk Email (Newsletter / Campaigns) ──────────────────────────────────────

export interface BulkEmailRecipient {
  email: string;
  name: string;
  substitutions?: Record<string, string>;
}

export async function sendBulkEmail(params: {
  recipients: BulkEmailRecipient[];
  subject: string;
  templateId: string;
  globalData?: Record<string, unknown>;
}): Promise<{ sent: number; failed: number }> {
  ensureInit();

  const CHUNK_SIZE = 1000; // SendGrid limit per request
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < params.recipients.length; i += CHUNK_SIZE) {
    const chunk = params.recipients.slice(i, i + CHUNK_SIZE);

    const personalizations = chunk.map((r) => ({
      to: [{ email: r.email, name: r.name }],
      dynamicTemplateData: {
        ...params.globalData,
        ...r.substitutions,
        recipientName: r.name,
      },
    }));

    try {
      await sgMail.send({
        from: FROM,
        subject: params.subject,
        templateId: params.templateId,
        personalizations,
      } as Parameters<typeof sgMail.send>[0]);
      sent += chunk.length;
    } catch (err) {
      console.error(`[emailService] Bulk send failed for chunk ${i}:`, err);
      failed += chunk.length;
    }
  }

  return { sent, failed };
}

// ─── Unsubscribe Group Management ─────────────────────────────────────────────

export async function addToUnsubscribeGroup(email: string, groupId: number): Promise<void> {
  ensureInit();
  await sgClient.request({
    method: "POST",
    url: `/v3/asm/groups/${groupId}/suppressions`,
    body: { recipient_emails: [email] },
  });
}

export async function removeFromUnsubscribeGroup(email: string, groupId: number): Promise<void> {
  ensureInit();
  await sgClient.request({
    method: "DELETE",
    url: `/v3/asm/groups/${groupId}/suppressions/${email}`,
  });
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function generateCalendarUrl(title: string, date: string, eventId: string): string {
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2hr default

  const format = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${format(startDate)}/${format(endDate)}`,
    details: `${process.env.NEXTAUTH_URL}/events/${eventId}`,
  });

  return `https://www.google.com/calendar/render?${params.toString()}`;
}

// ─── Template HTML Fallbacks (for testing without SendGrid templates) ─────────

export function getWelcomeEmailHtml(userName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Uni-O</title></head>
<body style="font-family: Arial, sans-serif; background: #0D0D1A; color: #E0E0FF; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1E1E35; border-radius: 16px; padding: 32px;">
    <h1 style="color: #8B5CF6;">Welcome to Uni-O, ${userName}! 🎉</h1>
    <p>You're now part of India's premier hackathon and coding challenge platform.</p>
    <p>Here's what you can do:</p>
    <ul>
      <li>🚀 Discover hackathons and tech fests</li>
      <li>💻 Sharpen DSA skills with daily challenges</li>
      <li>🤝 Build legendary teams</li>
      <li>🏆 Compete in contests and win prizes</li>
    </ul>
    <a href="${process.env.NEXTAUTH_URL}/challenges"
       style="display: inline-block; background: #6C3BFF; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 16px;">
      Start Practicing →
    </a>
    <p style="color: #8B8BAD; font-size: 12px; margin-top: 32px;">
      You received this email because you signed up for Uni-O.<br>
      <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #8B5CF6;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}

export function getEventRegistrationHtml(params: {
  userName: string;
  eventTitle: string;
  eventDate: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background: #0D0D1A; color: #E0E0FF; padding: 40px;">
  <div style="max-width: 600px; margin: 0 auto; background: #1E1E35; border-radius: 16px; padding: 32px;">
    <h1 style="color: #10B981;">Registration Confirmed! ✅</h1>
    <p>Hey ${params.userName},</p>
    <p>You're officially registered for <strong>${params.eventTitle}</strong>.</p>
    <p>📅 Event Date: ${params.eventDate}</p>
    <p style="color: #8B8BAD; font-size: 12px; margin-top: 32px;">
      <a href="${process.env.NEXTAUTH_URL}/unsubscribe" style="color: #8B5CF6;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}