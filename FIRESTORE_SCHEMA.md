# Unio Project - Firestore Database Schema

Complete reference for all Firestore collections and their document structures.

---

## Root Collections

### 1. **events** - Event listing and management
**Collection Path:** `/events`

**Document Structure:**
```
{
  id: string;                    // Auto-generated document ID
  title: string;                 // Event title
  org: string;                   // Organizing company
  banner: string;                // Emoji/icon
  date: string;                  // Event date
  deadline: string;              // Registration deadline
  mode: 'Online' | 'Offline' | 'Hybrid';
  city: string;                  // Event location
  prize: string;                 // Prize amount display
  difficulty: 'Easy' | 'Intermediate' | 'Advanced';
  teamSize: string;              // e.g., "1-5"
  category: string;              // e.g., "Hackathon", "Contest"
  tags: string[];                // e.g., ["Web", "AI"]
  registered: number;            // Display count
  featured: boolean;
  description?: string;
  rules?: string;
  themes?: string[];
  judgingCriteria?: string[];
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registrationCount?: number;    // Actual count
  viewCount?: number;
  averageRating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
  isTrending?: boolean;
  createdBy?: string;            // Creator user ID
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  eligibility?: {
    yearAllowed: string[];
    courseAllowed: string[];
    openToAll: boolean;
  };
  prizes?: {
    total: number;
    breakdown: [
      { position: string; amount: number; description: string }
    ];
    perks: string[];
  };
}
```

**Sub-collections:**
- `events/{eventId}/registrations` - User registrations
- `events/{eventId}/reviews` - Event reviews

---

### 2. **events/{eventId}/registrations** - User event registrations
**Collection Path:** `/events/{eventId}/registrations`

**Document Structure (Document ID = userId):**
```
{
  id?: string;        // User ID (document ID)
  userId: string;     // User ID
  eventId: string;    // Event ID
  eventTitle: string; // Event title for reference
  teamId: string | null;
  registeredAt: Timestamp;
  status: 'registered' | 'attended' | 'submitted' | 'winner';
}
```

**Example:** `/events/event-4/registrations/user123`

---

### 3. **events/{eventId}/reviews** - Event review and ratings
**Collection Path:** `/events/{eventId}/reviews`

**Document Structure:**
```
{
  id?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;     // 1-5
  review: string;
  helpful: number;    // Upvote count
  notHelpful: number; // Downvote count
  createdAt: Timestamp;
}
```

---

### 4. **studentRegistrations** - Central registration index
**Collection Path:** `/studentRegistrations`

**Document Structure (Document ID = userId_eventId):**
```
{
  id?: string;        // userId_eventId format
  eventId: string;
  eventTitle: string; // Event title
  userId: string;
  teamId: string | null;
  registeredAt: Timestamp;
  status: 'registered' | 'attended' | 'submitted' | 'winner';
}
```

**Example:** `/studentRegistrations/user123_event-4`

---

### 5. **users** - User profiles
**Collection Path:** `/users`

**Document Structure (Document ID = userId):**
```
{
  id: string;        // User ID (from Auth)
  uid?: string;      // Firebase Auth UID
  email?: string;
  displayName?: string;
  photoURL?: string;
  name: string;
  avatar: string;    // Emoji character chosen by user (e.g. "🧑‍💻", "🦊"); falls back to first letter of name if not set
  college: string;
  color: string;     // Profile color hex
  bio?: string;
  academicYear?: string;
  course?: string;
  branch?: string;
  year?: string;
  skills: string[];
  interests?: string[];
  preferredRoles?: string[];
  location?: { city: string; state: string };
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
  score: number;
  solved: number;
  streak: number;
  reputation?: number;
  role?: string;     // 'user' | 'admin'
  isPremium?: boolean;
  premiumExpiresAt?: Timestamp | null;
  phoneNumber?: string | null;
  settings?: {
    profileVisibility: string;  // 'public' | 'private'
    notifications: {
      email: boolean;
      push: boolean;
      inApp: boolean;
      frequency: string;       // 'realtime' | 'daily'
      categories: {
        events: boolean;
        teams: boolean;
        challenges: boolean;
        achievements: boolean;
        social: boolean;
      };
    };
    theme: string;            // 'dark' | 'light'
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
    rating: number;          // Elo rating
    eventsParticipated: number;
    eventsWon: number;
    teamsFormed: number;
    globalRank: number;
    collegeRank: number;
  };
  badges?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  lastLoginAt?: Timestamp;
}
```

**Sub-collections:**
- `users/{userId}/submissions` - Code submissions
- `users/{userId}/bookmarks` - Bookmarked events/challenges
- `users/{userId}/notifications` - User notifications
- `users/{userId}/activityFeed` - Activity log
- `users/{userId}/achievements` - Earned achievements

---

### 6. **users/{userId}/submissions** - Code challenge submissions
**Collection Path:** `/users/{userId}/submissions`

**Document Structure:**
```
{
  id?: string;
  userId: string;
  challengeId: string;
  language: string;           // 'python', 'javascript', etc.
  code: string;
  status: 'accepted' | 'wrong_answer' | 'time_limit' | 'runtime_error' | 'compilation_error';
  runtime: string;            // e.g., "245ms"
  memory: string;             // e.g., "52MB"
  error?: string;
  submittedAt: Timestamp;
}
```

---

### 7. **users/{userId}/bookmarks** - Bookmarked items
**Collection Path:** `/users/{userId}/bookmarks`

**Document Structure (Document ID = itemId):**
```
{
  type: 'event' | 'challenge';
  itemId: string;
  createdAt: Timestamp;
}
```

---

### 8. **users/{userId}/notifications** - User notifications
**Collection Path:** `/users/{userId}/notifications`

**Document Structure:**
```
{
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  relatedId?: string;         // Event/Team/Challenge ID
  relatedType?: string;       // 'event' | 'team' | 'challenge'
  isRead: boolean;
  createdAt: Timestamp;
}
```

---

### 9. **users/{userId}/activityFeed** - User activity log
**Collection Path:** `/users/{userId}/activityFeed`

**Document Structure:**
```
{
  action: string;            // 'registered_event', 'solved_challenge', etc.
  description: string;
  relatedId?: string;
  relatedType?: string;
  createdAt: Timestamp;
}
```

---

### 10. **users/{userId}/achievements** - Earned badges/achievements
**Collection Path:** `/users/{userId}/achievements`

**Document Structure (Document ID = achievementId):**
```
{
  achievementId: string;
  name: string;
  description: string;
  icon?: string;
  earnedAt: Timestamp;
}
```

---

### 11. **challenges** - Coding challenge problems
**Collection Path:** `/challenges`

**Document Structure:**
```
{
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  description: string;
  acceptance: number;         // e.g., 65.5
  tags: string[];
  submissions: string;        // Display total
  slug?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  domain?: string;            // 'Array', 'String', etc.
  topics?: string[];
  companies?: string[];
  xpReward?: number;
  isPremium?: boolean;
  acceptanceRate?: number;
  totalSubmissions?: number;
  totalSolved?: number;
  sampleTestCases?: [
    { input: string; output: string; explanation?: string }
  ];
  hints?: string[];
  starterCode?: object;       // { python: "...", javascript: "..." }
  solution?: {
    approaches: [
      {
        title: string;
        description: string;
        code: object;
        timeComplexity: string;
        spaceComplexity: string;
      }
    ];
    videoURL?: string | null;
  };
  relatedChallenges?: string[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
```

**Sub-collections:**
- `challenges/{challengeId}/discussions` - Challenge discussions

---

### 12. **challenges/{challengeId}/discussions** - Challenge Q&A
**Collection Path:** `/challenges/{challengeId}/discussions`

**Document Structure:**
```
{
  id?: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isAnswer: boolean;
  createdAt: Timestamp;
}
```

**Sub-collections:**
- `challenges/{challengeId}/discussions/{discussionId}/replies` - Discussion replies

---

### 13. **teams** - Team management
**Collection Path:** `/teams`

**Document Structure:**
```
{
  id: string;
  name: string;
  description?: string;
  createdBy: string;          // Creator user ID
  memberIds: string[];        // Array of user IDs for faster queries
  members: [
    {
      userId: string;
      role: 'leader' | 'member';
      joinedAt: Timestamp;
    }
  ];
  status: 'forming' | 'active' | 'inactive';
  chat: boolean;
  profilePic?: string;
  bio?: string;
  skills?: string[];
  lookingFor?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Sub-collections:**
- `teams/{teamId}/messages` - Team chat
- `teams/{teamId}/requests` - Join requests
- `teams/{teamId}/presence` - User presence
- `teams/{teamId}/typing` - Typing indicators

---

### 14. **teams/{teamId}/messages** - Team chat messages
**Collection Path:** `/teams/{teamId}/messages`

**Document Structure:**
```
{
  id?: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  message: string;
  type: 'text' | 'image' | 'file';
  attachmentUrl?: string;
  createdAt: Timestamp;
}
```

---

### 15. **teams/{teamId}/requests** - Team join requests
**Collection Path:** `/teams/{teamId}/requests`

**Document Structure:**
```
{
  id?: string;
  fromUserId: string;
  fromUserName: string;
  fromUserPhoto?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Timestamp;
}
```

---

### 16. **teams/{teamId}/presence** - User online status
**Collection Path:** `/teams/{teamId}/presence`

**Document Structure (Document ID = userId):**
```
{
  status: 'online' | 'idle' | 'offline';
  lastSeen: Timestamp;
}
```

---

### 17. **teams/{teamId}/typing** - Typing indicators
**Collection Path:** `/teams/{teamId}/typing`

**Document Structure (Document ID = userId):**
```
{
  isTyping: boolean;
  lastTyped: Timestamp;
}
```

---

### 18. **teamRequests** - Open team join requests
**Collection Path:** `/teamRequests`

**Document Structure:**
```
{
  id?: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  skills?: string[];
  lookingFor?: string;
  message?: string;
  responses: number;
  status: 'open' | 'closed';
  createdAt: Timestamp;
}
```

---

### 19. **forumThreads** - Discussion forum threads
**Collection Path:** `/forumThreads`

**Document Structure:**
```
{
  id: string;
  title: string;
  content: string;
  category: string;           // 'General', 'Help', 'Events', etc.
  userId: string;
  userName: string;
  userPhoto?: string;
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
```

**Sub-collections:**
- `forumThreads/{threadId}/replies` - Thread replies

---

### 20. **forumThreads/{threadId}/replies** - Forum replies
**Collection Path:** `/forumThreads/{threadId}/replies`

**Document Structure:**
```
{
  id?: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  content: string;
  upvotes: number;
  downvotes: number;
  isBestAnswer: boolean;
  createdAt: Timestamp;
}
```

---

### 21. **learningPaths** - Structured learning courses
**Collection Path:** `/learningPaths`

**Document Structure:**
```
{
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  challenges: string[];       // Array of challenge IDs
  totalChallenges: number;
  enrolledCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Sub-collections:**
- `learningPaths/{pathId}/enrollments` - User enrollments

---

### 22. **learningPaths/{pathId}/enrollments** - User learning progress
**Collection Path:** `/learningPaths/{pathId}/enrollments`

**Document Structure (Document ID = userId):**
```
{
  enrolledAt: Timestamp;
  completedChallenges: string[];
  progress: number;           // 0-100 percentage
  lastAccessedAt: Timestamp;
}
```

---

### 23. **contests** - Competitive programming contests
**Collection Path:** `/contests`

**Document Structure:**
```
{
  id: string;
  title: string;
  description: string;
  startTime: Timestamp;
  endTime: Timestamp;
  duration: number;           // Minutes
  challenges: string[];       // Challenge IDs
  registeredCount: number;
  participantCount: number;
  createdAt: Timestamp;
}
```

**Sub-collections:**
- `contests/{contestId}/leaderboard` - Contest rankings
- `contests/{contestId}/submissions` - Contest submissions

---

### 24. **contests/{contestId}/leaderboard** - Contest rankings
**Collection Path:** `/contests/{contestId}/leaderboard`

**Document Structure (Document ID = userId):**
```
{
  userId: string;
  userName: string;
  rank: number;
  solvedProblems: number;
  totalTime: number;         // In minutes
  score: number;
  lastSubmissionTime: Timestamp;
}
```

---

## Query Patterns & Indexes

### Common Queries:

1. **Get all events:**
   ```
   collection('events').orderBy('createdAt', 'desc').limit(50)
   ```

2. **Get user's registrations:**
   ```
   collection('studentRegistrations').where('userId', '==', userId)
   ```

3. **Get event registrations:**
   ```
   collection('events/{eventId}/registrations')
   ```

4. **Get user's teams:**
   ```
   collection('teams').where('memberIds', 'array-contains', userId)
   ```

5. **Get forum threads by category:**
   ```
   collection('forumThreads').where('category', '==', category)
     .orderBy('isPinned', 'desc').orderBy('createdAt', 'desc')
   ```

6. **Get leaderboard:**
   ```
   collection('users').orderBy('stats.xp', 'desc').limit(50)
   ```

---

## Security Rules Summary

✅ Users can read their own data
✅ Users can write to their own registrations/bookmarks
✅ Admin-only: Event creation, challenge management, contest setup
✅ Public read: Events, challenges, forum threads, leaderboards
✅ Authenticated users only: Team operations, submissions, forum participation

---

## Total Collections: 24 Root + Sub-collections

**Root Collections (13):**
- events, studentRegistrations, users, challenges, teams, teamRequests, forumThreads, learningPaths, contests

**Sub-collections (11+):**
- Per-event: registrations, reviews
- Per-user: submissions, bookmarks, notifications, activityFeed, achievements
- Per-team: messages, requests, presence, typing
- Per-challenge: discussions
- Per-forum-thread: replies
- Per-learning-path: enrollments
- Per-contest: leaderboard, submissions
