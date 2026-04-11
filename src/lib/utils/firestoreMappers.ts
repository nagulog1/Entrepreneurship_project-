import type { Challenge, Event, Teammate, User } from '@/types';

const EVENT_BANNERS = ['🚀', '💡', '🏆', '🎯', '⚡', '🌟'];
const USER_COLORS = ['#6C3BFF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickByHash(items: string[], seed: string): string {
  if (items.length === 0) return '';
  return items[hashCode(seed) % items.length];
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  const d = new Date(value as string | number | Date);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDate(value: unknown, fallback = 'TBA'): string {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function titleCase(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function normalizeMode(mode?: string): Event['mode'] {
  const m = (mode || '').toLowerCase();
  if (m === 'offline') return 'Offline';
  if (m === 'hybrid') return 'Hybrid';
  return 'Online';
}

function normalizeEventDifficulty(difficulty?: string): Event['difficulty'] {
  const d = (difficulty || '').toLowerCase();
  if (d === 'beginner') return 'Easy';
  if (d === 'advanced') return 'Advanced';
  return 'Intermediate';
}

function normalizeChallengeDifficulty(difficulty?: string): Challenge['difficulty'] {
  const d = (difficulty || '').toLowerCase();
  if (d === 'hard') return 'Hard';
  if (d === 'medium' || d === 'intermediate') return 'Medium';
  return 'Easy';
}

function formatPrize(amount?: number): string {
  if (!amount || amount <= 0) return 'TBA';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function compactNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

export function mapEventToCardEvent(event: Partial<Event> & { id?: string }): Event {
  const id = event.id || event.slug || `event-${hashCode(event.title || 'event')}`;
  const fallbackOrg = event.organizerName || event.org || 'SkillQuest';
  const fallbackDate = event.dates?.eventStart || event.createdAt;
  const fallbackDeadline = event.dates?.registrationEnd;

  return {
    id,
    title: event.title || 'Untitled Event',
    org: fallbackOrg,
    banner: event.banner || pickByHash(EVENT_BANNERS, id),
    date: event.date || formatDate(fallbackDate),
    deadline: event.deadline || formatDate(fallbackDeadline),
    mode: event.mode ? normalizeMode(event.mode) : 'Online',
    city: event.location?.city || event.city || 'Remote',
    prize: event.prize || formatPrize(event.prizes?.total),
    difficulty: event.difficulty ? normalizeEventDifficulty(event.difficulty) : 'Intermediate',
    teamSize: event.teamSize || '1-4',
    category: event.category ? titleCase(event.category) : 'Hackathon',
    tags: event.tags && event.tags.length ? event.tags : ['Tech'],
    registered: event.registrationCount ?? event.registered ?? 0,
    featured: Boolean(event.isFeatured ?? event.featured),
    description: event.description,
    rules: event.rules,
    prizes: event.prizes,
    dates: event.dates,
  };
}

export function mapChallengeToListChallenge(challenge: Partial<Challenge> & { id?: string }): Challenge {
  const id = challenge.id || challenge.slug || `challenge-${hashCode(challenge.title || 'challenge')}`;
  const solved = challenge.totalSolved ?? 0;
  const submissions = challenge.totalSubmissions ?? 0;
  const acceptance =
    challenge.acceptanceRate ??
    (submissions > 0 ? Math.round((solved / submissions) * 100) : challenge.acceptance ?? 0);

  return {
    id,
    title: challenge.title || 'Untitled Challenge',
    difficulty: challenge.difficulty ? normalizeChallengeDifficulty(challenge.difficulty) : 'Easy',
    acceptance,
    tags: challenge.topics?.length ? challenge.topics.slice(0, 3) : challenge.tags || ['DSA'],
    submissions: challenge.submissions || compactNumber(submissions || 0),
    description: challenge.description,
    sampleTestCases: challenge.sampleTestCases,
    constraints: challenge.constraints,
    starterCode: challenge.starterCode,
    xpReward: challenge.xpReward,
    totalSolved: solved,
    totalSubmissions: submissions,
  };
}

export function mapUserToLeaderboardUser(user: Partial<User> & { id?: string; uid?: string }): User {
  const id = user.id || user.uid || `user-${hashCode(user.displayName || user.name || 'user')}`;
  const name = user.displayName || user.name || 'Anonymous';
  const color = user.color || pickByHash(USER_COLORS, id);
  const skills = Array.isArray(user.skills)
    ? user.skills.map((skill) => (typeof skill === 'string' ? skill : skill.name))
    : [];

  return {
    id,
    name,
    college: user.college || 'Unknown College',
    skills,
    score: user.stats?.xp ?? user.score ?? 0,
    solved: user.stats?.totalChallengesSolved ?? user.solved ?? 0,
    streak: user.stats?.currentStreak ?? user.streak ?? 0,
    avatar: user.avatar || name.slice(0, 2).toUpperCase(),
    color,
    displayName: user.displayName,
    photoURL: user.photoURL,
    stats: user.stats,
  };
}

export function mapUserToTeammate(user: Partial<User> & { id?: string; uid?: string }): Teammate {
  const leaderboardUser = mapUserToLeaderboardUser(user);

  return {
    id: leaderboardUser.id,
    name: leaderboardUser.name,
    college: leaderboardUser.college,
    skills: leaderboardUser.skills as string[],
    match: Math.min(99, 70 + (leaderboardUser.solved % 30)),
    hackathons: user.stats?.eventsParticipated ?? Math.max(1, Math.floor(leaderboardUser.solved / 20)),
    rating: Number(((user.stats?.rating ?? 1200) / 300).toFixed(1)),
    looking: 'Team Member',
    avatar: leaderboardUser.avatar,
    color: leaderboardUser.color,
  };
}
