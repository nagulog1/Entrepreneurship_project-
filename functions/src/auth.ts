import * as functions from 'firebase-functions/v1';
import { admin, db, storage } from './admin';
import { sendWelcomeEmail } from './notifications';

export const createUserDocument = functions.auth.user().onCreate(async (user) => {
  const userDoc = {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    photoURL: user.photoURL ?? '',
    phoneNumber: user.phoneNumber ?? null,
    college: '',
    academicYear: '',
    course: '',
    location: { city: '', state: '' },
    bio: '',
    skills: [],
    interests: [],
    preferredRoles: [],
    socialLinks: {
      github: '',
      linkedin: '',
      twitter: '',
      portfolio: '',
    },
    settings: {
      profileVisibility: 'public',
      notifications: {
        email: true,
        push: true,
        inApp: true,
        frequency: 'realtime',
        categories: {
          events: true,
          teams: true,
          challenges: true,
          achievements: true,
          social: true,
        },
      },
      theme: 'system',
    },
    stats: {
      totalChallengesSolved: 0,
      easyCount: 0,
      mediumCount: 0,
      hardCount: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastSolvedDate: null,
      xp: 0,
      level: 1,
      rating: 1200,
      eventsParticipated: 0,
      eventsWon: 0,
      teamsFormed: 0,
      globalRank: 0,
      collegeRank: 0,
    },
    badges: [],
    isPremium: false,
    premiumExpiresAt: null,
    reputation: 5.0,
    role: 'user',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('users').doc(user.uid).set(userDoc, { merge: true });
  await sendWelcomeEmail(user.email, user.displayName);
});

export const deleteUserData = functions.auth.user().onDelete(async (user) => {
  const userId = user.uid;

  const batch = db.batch();
  batch.delete(db.collection('users').doc(userId));

  const subcollections = ['submissions', 'bookmarks', 'notifications', 'activityFeed', 'achievements'];
  for (const subcollection of subcollections) {
    const snap = await db.collection('users').doc(userId).collection(subcollection).get();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
  }

  await batch.commit();

  try {
    await storage.bucket().deleteFiles({ prefix: `users/${userId}/` });
  } catch (err) {
    functions.logger.warn('Storage cleanup skipped or failed', { userId, err });
  }
});
