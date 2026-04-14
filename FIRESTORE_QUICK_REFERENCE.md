# Firestore Database - Quick Reference Table

## All Collections at a Glance

| # | Collection Name | Document ID | Purpose | Key Fields |
|---|---|---|---|---|
| **Root Collections** | | | | |
| 1 | `events` | Auto-generated | Event listings | title, org, category, status, registrationCount, createdBy |
| 2 | `studentRegistrations` | `{userId}_{eventId}` | Central registration tracker | userId, eventId, eventTitle, status, teamId |
| 3 | `users` | userId (Firebase Auth) | User profiles | displayName, email, college, stats, role, isPremium |
| 4 | `challenges` | Auto-generated | Coding problems | title, difficulty, domain, totalSolved, isPremium |
| 5 | `teams` | Auto-generated | Team management | name, createdBy, memberIds, status, members |
| 6 | `teamRequests` | Auto-generated | Open team join requests | userId, skills, message, status, createdAt |
| 7 | `forumThreads` | Auto-generated | Discussion forum | title, category, userId, replies, isSolved, isPinned |
| 8 | `learningPaths` | Auto-generated | Structured courses | title, level, challenges[], enrolledCount |
| 9 | `contests` | Auto-generated | Coding contests | title, startTime, endTime, challenges[] |
| | | | | |
| **Event Sub-collections** | | | | |
| 10 | `events/{id}/registrations` | userId | User registrations per event | userId, eventId, eventTitle, status, teamId |
| 11 | `events/{id}/reviews` | Auto-generated | Event reviews/ratings | userId, rating, review, helpful, notHelpful |
| | | | | |
| **User Sub-collections** | | | | |
| 12 | `users/{id}/submissions` | Auto-generated | Code submissions | userId, challengeId, status, runtime, memory |
| 13 | `users/{id}/bookmarks` | itemId | Bookmarked items | type (event/challenge), itemId |
| 14 | `users/{id}/notifications` | Auto-generated | User notifications | title, message, type, relatedId, isRead |
| 15 | `users/{id}/activityFeed` | Auto-generated | Activity log | action, description, relatedId, relatedType |
| 16 | `users/{id}/achievements` | achievementId | Earned badges | achievementId, name, earnedAt |
| | | | | |
| **Challenge Sub-collections** | | | | |
| 17 | `challenges/{id}/discussions` | Auto-generated | Q&A discussions | userId, content, upvotes, isAnswer |
| | | | | |
| **Team Sub-collections** | | | | |
| 18 | `teams/{id}/messages` | Auto-generated | Team chat | senderId, message, type (text/image/file) |
| 19 | `teams/{id}/requests` | Auto-generated | Team join requests | fromUserId, message, status |
| 20 | `teams/{id}/presence` | userId | Online status | status (online/idle/offline), lastSeen |
| 21 | `teams/{id}/typing` | userId | Typing indicators | isTyping, lastTyped |
| | | | | |
| **Forum Sub-collections** | | | | |
| 22 | `forumThreads/{id}/replies` | Auto-generated | Thread replies | userId, content, upvotes, isBestAnswer |
| | | | | |
| **Learning Path Sub-collections** | | | | |
| 23 | `learningPaths/{id}/enrollments` | userId | User progress | completedChallenges[], progress (%) |
| | | | | |
| **Contest Sub-collections** | | | | |
| 24 | `contests/{id}/leaderboard` | userId | Contest standings | rank, solvedProblems, score, totalTime |

---

## Key Relationships

```
Users
  ├── User Profile (users/{id})
  ├── Submissions (users/{id}/submissions)
  ├── Bookmarks (users/{id}/bookmarks)
  ├── Notifications (users/{id}/notifications)
  ├── Activity Feed (users/{id}/activityFeed)
  └── Achievements (users/{id}/achievements)

Events
  ├── Event Details (events/{id})
  ├── Registrations (events/{id}/registrations) →→ Student Registration
  └── Reviews (events/{id}/reviews)

Student Registrations
  └── studentRegistrations/{userId}_{eventId}
      ├── References: User ✓
      └── References: Event ✓

Teams
  ├── Team Details (teams/{id})
  ├── Members (via memberIds array)
  ├── Messages (teams/{id}/messages)
  ├── Requests (teams/{id}/requests)
  ├── Presence (teams/{id}/presence)
  └── Typing (teams/{id}/typing)

Challenges
  ├── Challenge Details (challenges/{id})
  └── Discussions (challenges/{id}/discussions)

Forum
  ├── Threads (forumThreads/{id})
  └── Replies (forumThreads/{id}/replies)

Learning Paths
  ├── Path Details (learningPaths/{id})
  └── Enrollments (learningPaths/{id}/enrollments)

Contests
  ├── Contest Details (contests/{id})
  └── Leaderboard (contests/{id}/leaderboard)
```

---

## Event Registration Flow (Complete)

### When User Registers for Event:

1. **Create registration entry:**
   - Path: `events/{eventId}/registrations/{userId}`
   - Stores: userId, eventId, eventTitle, teamId, status, registeredAt

2. **Create indexed student registration:**
   - Path: `studentRegistrations/{userId}_{eventId}`
   - Stores: userId, eventId, eventTitle, teamId, status, registeredAt

3. **Increment event counter:**
   - Update: `events/{eventId}.registrationCount += 1`

### When User Unregisters:

1. Delete: `events/{eventId}/registrations/{userId}`
2. Delete: `studentRegistrations/{userId}_{eventId}`
3. Update: `events/{eventId}.registrationCount -= 1`

### Query Patterns:

- **Get specific event registrations:**
  ```
  collection('events/{eventId}/registrations')
  ```

- **Get all user's registrations:**
  ```
  collection('studentRegistrations').where('userId', '==', userId)
  ```

- **Check if user registered for event:**
  ```
  getDoc('events/{eventId}/registrations/{userId}')
  ```

---

## Data Size Guide

| Collection | Est. Document Size | Growth Rate |
|---|---|---|
| events | ~5-50 KB | Slow (weekly) |
| studentRegistrations | ~1 KB | Medium (daily events) |
| users | ~10-30 KB | Slow (signup dependent) |
| challenges | ~20-100 KB | Slow (monthly) |
| teams | ~5-20 KB | Medium (daily) |
| teamRequests | ~2-5 KB | Medium (daily) |
| forumThreads | ~3-10 KB | Fast (continuous) |
| contests | ~5-20 KB | Slow (weekly) |

---

## File Location

**Full schema documentation:** `FIRESTORE_SCHEMA.md`

This table provides quick reference. See FIRESTORE_SCHEMA.md for complete field definitions and examples.
