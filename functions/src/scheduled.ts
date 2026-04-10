import * as functions from 'firebase-functions/v1';
import { admin, db } from './admin';

export const updateDailyChallenge = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const snap = await db
      .collection('challenges')
      .where('isPremium', '==', false)
      .limit(500)
      .get();

    if (snap.empty) {
      functions.logger.info('No non-premium challenges available for daily challenge update');
      return null;
    }

    const docs = snap.docs;
    const random = docs[Math.floor(Math.random() * docs.length)];

    await db.collection('adminConfig').doc('general').set({
      dailyChallenge: random.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return null;
  });

export const updateLeaderboards = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const usersSnap = await db
      .collection('users')
      .orderBy('stats.xp', 'desc')
      .limit(1000)
      .get();

    if (usersSnap.empty) return null;

    const batch = db.batch();
    usersSnap.docs.forEach((docSnap, index) => {
      batch.set(docSnap.ref, {
        stats: {
          globalRank: index + 1,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    });

    await batch.commit();
    return null;
  });

export const checkPremiumExpiry = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    const expiredSnap = await db
      .collection('subscriptions')
      .where('status', '==', 'active')
      .where('endDate', '<=', now)
      .where('autoRenew', '==', false)
      .get();

    if (expiredSnap.empty) return null;

    const batch = db.batch();
    expiredSnap.docs.forEach((docSnap) => {
      const subscription = docSnap.data();
      const userId = subscription.userId as string | undefined;

      batch.set(docSnap.ref, {
        status: 'expired',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      if (userId) {
        const userRef = db.collection('users').doc(userId);
        batch.set(userRef, {
          isPremium: false,
          premiumExpiresAt: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    });

    await batch.commit();
    return null;
  });

export const sendEventReminders = functions.pubsub
  .schedule('0 * * * *')
  .timeZone('UTC')
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();
    const tomorrow = new Date(now.toDate());
    tomorrow.setHours(tomorrow.getHours() + 24);

    const upcoming = await db
      .collection('events')
      .where('dates.registrationEnd', '>=', now)
      .where('dates.registrationEnd', '<=', admin.firestore.Timestamp.fromDate(tomorrow))
      .where('status', '==', 'upcoming')
      .get();

    for (const eventDoc of upcoming.docs) {
      const event = eventDoc.data();
      const bookmarks = await db
        .collectionGroup('bookmarks')
        .where('type', '==', 'event')
        .where('itemId', '==', eventDoc.id)
        .get();

      for (const bookmarkDoc of bookmarks.docs) {
        const userDocRef = bookmarkDoc.ref.parent.parent;
        const userId = userDocRef?.id;
        if (!userId) continue;

        const registrationSnap = await db
          .collection('events')
          .doc(eventDoc.id)
          .collection('registrations')
          .where('userId', '==', userId)
          .limit(1)
          .get();

        if (!registrationSnap.empty) continue;

        await db.collection('users').doc(userId).collection('notifications').add({
          type: 'event_reminder',
          title: 'Registration Closing Soon!',
          message: `Registration for "${event.title ?? 'this event'}" closes in 24 hours`,
          link: `/events/${eventDoc.id}`,
          isRead: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: { eventId: eventDoc.id },
        });
      }
    }

    return null;
  });
