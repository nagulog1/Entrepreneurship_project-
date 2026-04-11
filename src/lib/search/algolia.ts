import type { Challenge, Event } from '@/types';

interface SearchResponse<T> {
  hits: T[];
}

function getEnv(name: string): string {
  return (process.env[name] || '').trim();
}

export function isAlgoliaSearchConfigured(): boolean {
  return Boolean(getEnv('NEXT_PUBLIC_ALGOLIA_APP_ID') && getEnv('NEXT_PUBLIC_ALGOLIA_SEARCH_KEY'));
}

async function queryIndex<T>(
  indexName: string,
  query: string,
  options: { filters?: string; hitsPerPage?: number } = {}
): Promise<T[]> {
  if (!isAlgoliaSearchConfigured() || !indexName || !query.trim()) return [];

  const appId = getEnv('NEXT_PUBLIC_ALGOLIA_APP_ID');
  const key = getEnv('NEXT_PUBLIC_ALGOLIA_SEARCH_KEY');

  const response = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/${encodeURIComponent(indexName)}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-API-Key': key,
      'X-Algolia-Application-Id': appId,
    },
    body: JSON.stringify({
      query,
      hitsPerPage: options.hitsPerPage ?? 20,
      filters: options.filters,
    }),
    cache: 'no-store',
  });

  if (!response.ok) return [];

  const json = (await response.json()) as SearchResponse<T>;
  return Array.isArray(json.hits) ? json.hits : [];
}

const DEFAULT_EVENT_BANNER = '🚀';

function toEvent(hit: Partial<Event> & { id?: string; objectID?: string }): Event {
  return {
    id: hit.id || hit.objectID || '',
    title: hit.title || 'Untitled Event',
    org: hit.org || 'Unknown Organizer',
    banner: hit.banner || DEFAULT_EVENT_BANNER,
    date: hit.date || 'TBA',
    deadline: hit.deadline || 'TBA',
    mode: (hit.mode as Event['mode']) || 'Online',
    city: hit.city || 'Remote',
    prize: hit.prize || 'TBA',
    difficulty: (hit.difficulty as Event['difficulty']) || 'Intermediate',
    teamSize: hit.teamSize || '1-4',
    category: hit.category || 'Hackathon',
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    registered: Number(hit.registered || 0),
    featured: Boolean(hit.featured),
  };
}

function toChallenge(hit: Partial<Challenge> & { id?: string; objectID?: string }): Challenge {
  return {
    id: hit.id || hit.objectID || '',
    title: hit.title || 'Untitled Challenge',
    difficulty: (hit.difficulty as Challenge['difficulty']) || 'Easy',
    acceptance: Number(hit.acceptance || 0),
    tags: Array.isArray(hit.tags) ? hit.tags : [],
    submissions: String(hit.submissions || '0'),
  };
}

export async function searchEventsInAlgolia(query: string, mode?: Event['mode']): Promise<Event[]> {
  const indexName = getEnv('NEXT_PUBLIC_ALGOLIA_EVENTS_INDEX') || 'unio_events';
  const filters = mode ? `mode:${mode}` : undefined;
  const hits = await queryIndex<Partial<Event> & { id?: string; objectID?: string }>(indexName, query, {
    filters,
    hitsPerPage: 40,
  });
  return hits.map(toEvent).filter((e) => Boolean(e.id));
}

export async function searchChallengesInAlgolia(query: string, difficulty?: Challenge['difficulty'] | 'All'): Promise<Challenge[]> {
  const indexName = getEnv('NEXT_PUBLIC_ALGOLIA_CHALLENGES_INDEX') || 'unio_challenges';
  const filters = difficulty && difficulty !== 'All' ? `difficulty:${difficulty}` : undefined;
  const hits = await queryIndex<Partial<Challenge> & { id?: string; objectID?: string }>(indexName, query, {
    filters,
    hitsPerPage: 60,
  });
  return hits.map(toChallenge).filter((c) => Boolean(c.id));
}
