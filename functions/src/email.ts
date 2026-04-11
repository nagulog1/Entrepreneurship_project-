import * as functions from 'firebase-functions/v1';

// ─── SendGrid email service ──────────────────────────────────────────────────
// Requires SENDGRID_API_KEY and SENDGRID_FROM_EMAIL in environment config.
// Set via: firebase functions:config:set sendgrid.api_key="SG.xxx" sendgrid.from_email="noreply@unio.app"
// Or use .env in functions/ directory.

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
}

function getSendGridConfig() {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@unio.app';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Unio';
  return { apiKey, fromEmail, fromName };
}

async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const { apiKey, fromEmail, fromName } = getSendGridConfig();
  if (!apiKey) {
    functions.logger.warn('SENDGRID_API_KEY not set — skipping email', { to: payload.to, subject: payload.subject });
    return false;
  }

  const body: Record<string, unknown> = {
    personalizations: [
      {
        to: [{ email: payload.to }],
        ...(payload.dynamicTemplateData
          ? { dynamic_template_data: payload.dynamicTemplateData }
          : {}),
      },
    ],
    from: { email: fromEmail, name: fromName },
    subject: payload.subject,
  };

  if (payload.templateId) {
    body.template_id = payload.templateId;
  } else {
    body.content = [
      { type: 'text/html', value: payload.html },
      ...(payload.text ? [{ type: 'text/plain', value: payload.text }] : []),
    ];
  }

  try {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      functions.logger.error('SendGrid API error', { status: res.status, body: errText });
      return false;
    }

    functions.logger.info('Email sent successfully', { to: payload.to, subject: payload.subject });
    return true;
  } catch (err) {
    functions.logger.error('SendGrid request failed', { err });
    return false;
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

const BRAND_COLOR = '#6C3BFF';
const BASE_URL = process.env.APP_BASE_URL || 'https://unio.app';

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin: 0; padding: 0; background: #0F0F23; color: #E0E0F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
  .header { text-align: center; margin-bottom: 32px; }
  .logo { font-size: 28px; font-weight: 700; color: ${BRAND_COLOR}; text-decoration: none; }
  .card { background: #1A1A2E; border-radius: 12px; padding: 32px; margin-bottom: 24px; border: 1px solid #2D2D50; }
  .btn { display: inline-block; background: ${BRAND_COLOR}; color: #fff !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
  .footer { text-align: center; color: #8B8BAD; font-size: 12px; margin-top: 32px; }
  h1, h2 { color: #E0E0F0; }
  a { color: ${BRAND_COLOR}; }
</style>
</head>
<body>
  <div class="container">
    <div class="header"><a href="${BASE_URL}" class="logo">⚡ Unio</a></div>
    ${content}
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Unio. All rights reserved.</p>
      <p><a href="${BASE_URL}/notifications">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Transactional Email Functions ───────────────────────────────────────────

export async function sendWelcomeEmail(email: string, displayName?: string | null): Promise<boolean> {
  const name = displayName || 'there';
  return sendEmail({
    to: email,
    subject: 'Welcome to Unio! 🚀',
    html: baseLayout(`
      <div class="card">
        <h1>Welcome, ${name}! 🎉</h1>
        <p>You've joined India's premier platform for hackathons, coding challenges, and team collaboration.</p>
        <p>Here's what you can do right away:</p>
        <ul>
          <li><strong>Browse Events</strong> — Find hackathons, workshops, and contests near you</li>
          <li><strong>Solve Challenges</strong> — Sharpen your skills and climb the leaderboard</li>
          <li><strong>Build Your Team</strong> — Find teammates with complementary skills</li>
          <li><strong>Learn & Grow</strong> — Follow structured learning paths</li>
        </ul>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/challenges" class="btn">Start Your First Challenge</a>
        </p>
      </div>
    `),
  });
}

export async function sendEventRegistrationEmail(
  email: string,
  userName: string,
  eventTitle: string,
  eventId: string,
  eventDate?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `You're registered for ${eventTitle}!`,
    html: baseLayout(`
      <div class="card">
        <h1>Registration Confirmed ✅</h1>
        <p>Hi ${userName},</p>
        <p>You've successfully registered for <strong>${eventTitle}</strong>!</p>
        ${eventDate ? `<p>📅 <strong>Date:</strong> ${eventDate}</p>` : ''}
        <p>Keep an eye on your dashboard for updates and important announcements.</p>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/events/${eventId}" class="btn">View Event Details</a>
        </p>
      </div>
    `),
  });
}

export async function sendEventReminderEmail(
  email: string,
  userName: string,
  eventTitle: string,
  eventId: string,
  hoursLeft: number
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `⏰ ${eventTitle} starts in ${hoursLeft} hours!`,
    html: baseLayout(`
      <div class="card">
        <h1>Event Starting Soon! ⏰</h1>
        <p>Hi ${userName},</p>
        <p><strong>${eventTitle}</strong> starts in <strong>${hoursLeft} hours</strong>.</p>
        <p>Make sure your team is ready and you've reviewed the event details.</p>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/events/${eventId}" class="btn">Go to Event</a>
        </p>
      </div>
    `),
  });
}

export async function sendSubscriptionConfirmEmail(
  email: string,
  userName: string,
  plan: string,
  endDate: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Unio Premium ${plan} — Activated! ⚡`,
    html: baseLayout(`
      <div class="card">
        <h1>Premium Activated! ⚡</h1>
        <p>Hi ${userName},</p>
        <p>Your <strong>Unio Premium ${plan}</strong> subscription is now active.</p>
        <p>📅 Valid until: <strong>${endDate}</strong></p>
        <p>You now have access to:</p>
        <ul>
          <li>All premium challenges and learning paths</li>
          <li>Advanced analytics and progress tracking</li>
          <li>Priority team matching</li>
          <li>Exclusive contests and rewards</li>
        </ul>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/challenges" class="btn">Explore Premium Content</a>
        </p>
      </div>
    `),
  });
}

export async function sendSubscriptionExpiryEmail(
  email: string,
  userName: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your Unio Premium subscription has expired',
    html: baseLayout(`
      <div class="card">
        <h1>Premium Expired</h1>
        <p>Hi ${userName},</p>
        <p>Your Unio Premium subscription has expired. You can still access all free features.</p>
        <p>Renew to continue enjoying premium challenges, analytics, and priority matching.</p>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/profile" class="btn">Renew Subscription</a>
        </p>
      </div>
    `),
  });
}

export async function sendTeamInviteEmail(
  email: string,
  inviterName: string,
  teamName: string,
  teamId: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `${inviterName} invited you to join "${teamName}"`,
    html: baseLayout(`
      <div class="card">
        <h1>Team Invitation 🤝</h1>
        <p><strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong>.</p>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/teams?teamId=${teamId}" class="btn">View Team</a>
        </p>
      </div>
    `),
  });
}

export async function sendWeeklyDigestEmail(
  email: string,
  userName: string,
  digest: {
    newEvents: number;
    newChallenges: number;
    xpGained: number;
    streakDays: number;
    rank: number;
  }
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: `Your weekly Unio recap 📊`,
    html: baseLayout(`
      <div class="card">
        <h1>Weekly Recap 📊</h1>
        <p>Hi ${userName}, here's your week at a glance:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #2D2D50;">🆕 New Events</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #2D2D50;font-weight:700;">${digest.newEvents}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2D2D50;">💡 New Challenges</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #2D2D50;font-weight:700;">${digest.newChallenges}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2D2D50;">⚡ XP Gained</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #2D2D50;font-weight:700;">${digest.xpGained}</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #2D2D50;">🔥 Streak</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #2D2D50;font-weight:700;">${digest.streakDays} days</td></tr>
          <tr><td style="padding:8px 0;">🏆 Global Rank</td><td style="text-align:right;padding:8px 0;font-weight:700;">#${digest.rank}</td></tr>
        </table>
        <p style="text-align:center;margin-top:24px;">
          <a href="${BASE_URL}/leaderboard" class="btn">View Leaderboard</a>
        </p>
      </div>
    `),
  });
}

// ─── Bulk Email (Admin scheduled) ────────────────────────────────────────────

export const sendWeeklyDigestBulk = functions.pubsub
  .schedule('0 9 * * 1')        // Every Monday 9 AM UTC
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const { db: adminDb } = await import('./admin');

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Count new events/challenges created in the last week
    const [eventsSnap, challengesSnap] = await Promise.all([
      adminDb.collection('events').where('createdAt', '>=', oneWeekAgo).get(),
      adminDb.collection('challenges').where('createdAt', '>=', oneWeekAgo).get(),
    ]);

    const usersSnap = await adminDb
      .collection('users')
      .where('settings.notifications.email', '==', true)
      .limit(5000)
      .get();

    let sent = 0;
    const batchSize = 50;
    const users = usersSnap.docs;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (userDoc) => {
          const user = userDoc.data();
          const email = user.email as string;
          if (!email) return;

          await sendWeeklyDigestEmail(email, user.displayName || 'User', {
            newEvents: eventsSnap.size,
            newChallenges: challengesSnap.size,
            xpGained: (user.stats?.xp ?? 0),
            streakDays: (user.stats?.currentStreak ?? 0),
            rank: (user.stats?.globalRank ?? 0),
          });
          sent++;
        })
      );
    }

    functions.logger.info('Weekly digest sent', { total: sent });
    return null;
  });

// ─── Callable: Admin-triggered bulk email ────────────────────────────────────

export const sendBulkEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');
  }

  const { db: adminDb } = await import('./admin');
  const senderSnap = await adminDb.collection('users').doc(context.auth.uid).get();
  if (senderSnap.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin only');
  }

  const subject = String(data?.subject ?? '').trim();
  const htmlContent = String(data?.htmlContent ?? '').trim();
  const targetAudience = String(data?.audience ?? 'all'); // 'all' | 'premium' | 'active'

  if (!subject || !htmlContent) {
    throw new functions.https.HttpsError('invalid-argument', 'subject and htmlContent required');
  }

  let usersQuery = adminDb.collection('users').where('settings.notifications.email', '==', true);
  if (targetAudience === 'premium') {
    usersQuery = usersQuery.where('isPremium', '==', true);
  }

  const usersSnap = await usersQuery.limit(10000).get();
  let sent = 0;

  const batchSize = 50;
  for (let i = 0; i < usersSnap.docs.length; i += batchSize) {
    const batch = usersSnap.docs.slice(i, i + batchSize);
    await Promise.allSettled(
      batch.map(async (userDoc) => {
        const email = userDoc.data().email as string;
        if (!email) return;
        const result = await sendEmail({
          to: email,
          subject,
          html: baseLayout(`<div class="card">${htmlContent}</div>`),
        });
        if (result) sent++;
      })
    );
  }

  return { sent, total: usersSnap.size };
});
