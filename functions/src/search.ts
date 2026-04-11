import * as functions from 'firebase-functions/v1';
import algoliasearch, { type SearchClient } from 'algoliasearch';
import { db } from './admin';

type AnyDoc = Record<string, unknown>;

const DEFAULT_INDEXES = {
  events: 'unio_events',
  challenges: 'unio_challenges',
  users: 'unio_users',
  forumThreads: 'unio_forum_threads',
};

let algoliaClient: SearchClient | null | undefined;

function getEnv(name: string): string {
  return (process.env[name] || '').trim();
}

function getIndexName(key: keyof typeof DEFAULT_INDEXES): string {
  return getEnv(`ALGOLIA_${key.toUpperCase()}_INDEX`) || DEFAULT_INDEXES[key];
}

function getAlgoliaClient(): SearchClient | null {
  if (algoliaClient !== undefined) return algoliaClient;

  const appId = getEnv('ALGOLIA_APP_ID');
  const adminKey = getEnv('ALGOLIA_ADMIN_KEY');
  if (!appId || !adminKey) {
    functions.logger.warn('Algolia env vars are missing. Search sync is disabled.');
    algoliaClient = null;
    return algoliaClient;
  }

  algoliaClient = algoliasearch(appId, adminKey);
  return algoliaClient;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v || '').trim())
    .filter(Boolean);
}

function mapEventForIndex(id: string, data: AnyDoc): AnyDoc {
  const location = (data.location || {}) as AnyDoc;
  const organizerName = String(data.organizerName || data.org || '').trim();
  return {
    objectID: id,
    id,
    title: String(data.title || '').trim(),
    org: organizerName || 'Unknown Organizer',
    banner: String(data.banner || '🚀'),
    date: String(data.date || ''),
    deadline: String(data.deadline || ''),
    mode: String(data.mode || 'Online'),
    city: String(location.city || data.city || 'Remote'),
    prize: String(data.prize || 'TBA'),
    difficulty: String(data.difficulty || 'Intermediate'),
    teamSize: String(data.teamSize || '1-4'),
    category: String(data.category || 'hackathon'),
    tags: normalizeStringArray(data.tags),
    registered: Number(data.registrationCount || data.registered || 0),
    featured: Boolean(data.isFeatured || data.featured),
    status: String(data.status || 'upcoming'),
    _collection: 'events',
    _updatedAt: Date.now(),
  };
}

function mapChallengeForIndex(id: string, data: AnyDoc): AnyDoc {
  const topics = normalizeStringArray(data.topics);
  const tags = normalizeStringArray(data.tags);
  return {
    objectID: id,
    id,
    title: String(data.title || '').trim(),
    difficulty: String(data.difficulty || 'Easy'),
    acceptance: Number(data.acceptanceRate || data.acceptance || 0),
    tags: tags.length ? tags : topics,
    submissions: String(data.submissions || data.totalSubmissions || '0'),
    xpReward: Number(data.xpReward || 0),
    domain: String(data.domain || ''),
    _collection: 'challenges',
    _updatedAt: Date.now(),
  };
}

function mapUserForIndex(id: string, data: AnyDoc): AnyDoc {
  const stats = (data.stats || {}) as AnyDoc;
  return {
    objectID: id,
    id,
    displayName: String(data.displayName || data.name || 'User'),
    college: String(data.college || ''),
    branch: String(data.branch || ''),
    skills: normalizeStringArray(data.skills),
    xp: Number(stats.xp || 0),
    rating: Number(stats.rating || 0),
    totalChallengesSolved: Number(stats.totalChallengesSolved || 0),
    role: String(data.role || 'user'),
    _collection: 'users',
    _updatedAt: Date.now(),
  };
}

function mapForumThreadForIndex(id: string, data: AnyDoc): AnyDoc {
  return {
    objectID: id,
    id,
    title: String(data.title || '').trim(),
    content: String(data.content || '').trim(),
    category: String(data.category || 'general'),
    tags: normalizeStringArray(data.tags),
    authorName: String(data.authorName || ''),
    upvotes: Number(data.upvotes || 0),
    replies: Number(data.replies || 0),
    views: Number(data.views || 0),
    _collection: 'forumThreads',
    _updatedAt: Date.now(),
  };
}

async function upsertObject(indexName: string, objectID: string, payload: AnyDoc | null): Promise<void> {
  const client = getAlgoliaClient();
  if (!client) return;
  const index = client.initIndex(indexName);

  if (!payload) {
    await index.deleteObject(objectID).catch(() => undefined);
    return;
  }

  await index.saveObject(payload);
}

async function reindexCollection(
  collectionName: string,
  indexName: string,
  mapper: (id: string, data: AnyDoc) => AnyDoc
): Promise<number> {
  const client = getAlgoliaClient();
  if (!client) return 0;

  const index = client.initIndex(indexName);
  const snap = await db.collection(collectionName).get();
  if (snap.empty) {
    await index.clearObjects();
    return 0;
  }

  const objects = snap.docs.map((d) => mapper(d.id, d.data() as AnyDoc));
  await index.replaceAllObjects(objects, { safe: true });
  return objects.length;
}

export const syncEventSearchIndex = functions.firestore.document('events/{eventId}').onWrite(async (change, context) => {
  const eventId = String(context.params.eventId || '');
  const afterData = change.after.exists ? (change.after.data() as AnyDoc) : null;
  const payload = afterData ? mapEventForIndex(eventId, afterData) : null;
  await upsertObject(getIndexName('events'), eventId, payload);
});

export const syncChallengeSearchIndex = functions.firestore.document('challenges/{challengeId}').onWrite(async (change, context) => {
  const challengeId = String(context.params.challengeId || '');
  const afterData = change.after.exists ? (change.after.data() as AnyDoc) : null;
  const payload = afterData ? mapChallengeForIndex(challengeId, afterData) : null;
  await upsertObject(getIndexName('challenges'), challengeId, payload);
});

export const syncUserSearchIndex = functions.firestore.document('users/{userId}').onWrite(async (change, context) => {
  const userId = String(context.params.userId || '');
  const afterData = change.after.exists ? (change.after.data() as AnyDoc) : null;
  const payload = afterData ? mapUserForIndex(userId, afterData) : null;
  await upsertObject(getIndexName('users'), userId, payload);
});

export const syncForumSearchIndex = functions.firestore.document('forumThreads/{threadId}').onWrite(async (change, context) => {
  const threadId = String(context.params.threadId || '');
  const afterData = change.after.exists ? (change.after.data() as AnyDoc) : null;
  const payload = afterData ? mapForumThreadForIndex(threadId, afterData) : null;
  await upsertObject(getIndexName('forumThreads'), threadId, payload);
});

export const reindexSearch = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const actor = await db.collection('users').doc(context.auth.uid).get();
  const role = String(actor.data()?.role || 'user');
  if (role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can trigger reindex.');
  }

  const target = String(data?.target || 'all');
  const result: Record<string, number> = {};

  if (target === 'all' || target === 'events') {
    result.events = await reindexCollection('events', getIndexName('events'), mapEventForIndex);
  }
  if (target === 'all' || target === 'challenges') {
    result.challenges = await reindexCollection('challenges', getIndexName('challenges'), mapChallengeForIndex);
  }
  if (target === 'all' || target === 'users') {
    result.users = await reindexCollection('users', getIndexName('users'), mapUserForIndex);
  }
  if (target === 'all' || target === 'forumThreads') {
    result.forumThreads = await reindexCollection('forumThreads', getIndexName('forumThreads'), mapForumThreadForIndex);
  }

  return { ok: true, reindexed: result };
});
