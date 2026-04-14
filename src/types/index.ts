import type { Timestamp } from 'firebase/firestore';

// ─── Core types (kept fully backward-compatible) ──────────────────────────────

export interface Event {
  id: string;
  title: string;
  org: string;
  banner: string;
  date: string;
  deadline: string;
  mode: 'Online' | 'Offline' | 'Hybrid';
  city: string;
  prize: string;
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  teamSize: string;
  category: string;
  tags: string[];
  registered: number;
  featured: boolean;
  // Extended Firebase fields (all optional for backward compat)
  slug?: string;
  description?: string;
  bannerURL?: string;
  organizerName?: string;
  organizerEmail?: string;
  location?: { city: string; state: string; country: string } | null;
  dates?: {
    registrationStart: Timestamp;
    registrationEnd: Timestamp;
    eventStart: Timestamp;
    eventEnd: Timestamp;
    resultAnnouncement: Timestamp | null;
  };
  prizes?: {
    total: number;
    breakdown: Array<{ position: string; amount: number; description: string }>;
    perks: string[];
  };
  eligibility?: { yearAllowed: string[]; courseAllowed: string[]; openToAll: boolean };
  themes?: string[];
  rules?: string;
  judgingCriteria?: string[];
  resources?: Array<{ title: string; url: string; type: string }>;
  faqs?: Array<{ question: string; answer: string }>;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registrationCount?: number;
  viewCount?: number;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Challenge {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptance: number;
  tags: string[];
  solved?: boolean;
  submissions: string;
  // Extended
  slug?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  sampleTestCases?: Array<{ input: string; output: string; explanation?: string }>;
  topics?: string[];
  companies?: string[];
  domain?: string;
  hints?: string[];
  solution?: {
    approaches: Array<{
      title: string;
      description: string;
      code: Record<string, string>;
      timeComplexity: string;
      spaceComplexity: string;
    }>;
    videoURL?: string | null;
  };
  starterCode?: Record<string, string>;
  acceptanceRate?: number;
  totalSubmissions?: number;
  totalSolved?: number;
  xpReward?: number;
  isPremium?: boolean;
  relatedChallenges?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface User {
  id: string;
  name: string;
  college: string;
  skills: string[] | Array<{ name: string; level: string }>;
  score: number;
  solved: number;
  streak: number;
  avatar: string;
  color: string;
  // Extended Firebase fields
  uid?: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string | null;
  academicYear?: string;
  course?: string;
  branch?: string;
  year?: string;
  bio?: string;
  location?: { city: string; state: string };
  interests?: string[];
  preferredRoles?: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
  settings?: {
    profileVisibility: string;
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
      frequency: string;
      categories: Record<string, boolean>;
    };
    theme: string;
  };
  stats?: {
    totalChallengesSolved: number;
    easyCount: number;
    mediumCount: number;
    hardCount: number;
    currentStreak: number;
    longestStreak: number;
    lastSolvedDate: Timestamp | null;
    xp: number;
    level: number;
    rating: number;
    eventsParticipated: number;
    eventsWon: number;
    teamsFormed: number;
    globalRank: number;
    collegeRank: number;
  };
  badges?: string[];
  isPremium?: boolean;
  premiumExpiresAt?: Timestamp | null;
  reputation?: number;
  role?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface Teammate {
  id: string;
  name: string;
  college: string;
  skills: string[];
  match: number;
  hackathons: number;
  rating: number;
  looking: string;
  avatar: string;
  color: string;
}

export interface TestCase {
  input: string;
  expected: string;
  got: string;
  pass: boolean;
}

export interface RunResult {
  status: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error';
  runtime: string;
  memory: string;
  cases: TestCase[];
  error?: string;
}

export interface Notification {
  msg: string;
  type: 'success' | 'error';
}

// ─── New Firebase types ───────────────────────────────────────────────────────

export interface FirestoreNotification {
  id?: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface Team {
  id: string;
  name: string;
  avatar: string;
  description: string;
  createdBy: string;
  members: Array<{ userId: string; role: string; joinedAt: Timestamp }>;
  memberIds?: string[];
  maxMembers: number;
  skills: string[];
  linkedEvents: string[];
  status: 'forming' | 'active' | 'disbanded';
  chat: boolean;
  resources: Array<{ title: string; url: string; addedBy: string }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TeamMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderPhoto: string;
  message: string;
  type: 'text' | 'file' | 'code';
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
}

export interface TeamRequest {
  id?: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  toUserId?: string | null;
  eventId?: string | null;
  type: 'looking_for_team' | 'looking_for_members';
  requiredSkills: string[];
  teamSize: number;
  role: string;
  message: string;
  expectations?: string;
  preferredCommunication?: string;
  status: 'open' | 'closed' | 'expired';
  responses: number;
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export interface ForumThread {
  id?: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  category: 'general' | 'event_experiences' | 'challenge_help' | 'team_formation' | 'career' | 'off_topic';
  tags: string[];
  views: number;
  replies: number;
  upvotes: number;
  downvotes: number;
  isSolved: boolean;
  isPinned: boolean;
  isLocked: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ForumReply {
  id?: string;
  authorId: string;
  authorName: string;
  authorPhoto: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isBestAnswer: boolean;
  createdAt: Timestamp;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  iconURL: string;
  category: 'milestone' | 'streak' | 'topic_mastery' | 'event' | 'speed' | 'social' | 'special';
  requirement: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  createdAt: Timestamp;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedTime: string;
  challenges: string[];
  enrolledCount: number;
  completionRate: number;
  tags?: string[];
  createdAt: Timestamp;
}

export interface Contest {
  id: string;
  title: string;
  description: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number;
  challenges: string[];
  participants: number;
  status: 'upcoming' | 'live' | 'ended';
  prizes: Array<{ position: number; amount: number; description: string }>;
  createdAt: Timestamp;
}

export interface ContestLeaderboardEntry {
  userId: string;
  userName: string;
  userPhoto: string;
  score: number;
  solved: number;
  penalty: number;
  rank: number;
  submissions: Array<{ challengeId: string; solvedAt: Timestamp; attempts: number }>;
}

export interface Submission {
  id?: string;
  challengeId: string;
  code: string;
  language: string;
  status: 'accepted' | 'wrong_answer' | 'tle' | 'runtime_error' | 'compilation_error';
  runtime: number;
  memory: number;
  passedTests: number;
  totalTests: number;
  submittedAt: Timestamp;
}

export interface EventRegistration {
  id?: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  teamId: string | null;
  registeredAt: Timestamp;
  status: 'registered' | 'attended' | 'submitted' | 'winner';
}

export interface StudentRegistration {
  id?: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  teamId: string | null;
  registeredAt: Timestamp;
  status: 'registered' | 'attended' | 'submitted' | 'winner';
}

export interface EventReview {
  id?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  review: string;
  helpful: number;
  notHelpful: number;
  createdAt: Timestamp;
}

export interface Mentorship {
  id?: string;
  mentorId: string;
  menteeId: string;
  status: 'requested' | 'active' | 'completed' | 'cancelled';
  domain: string;
  goals: string[];
  requestMessage: string;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdAt: Timestamp;
}
