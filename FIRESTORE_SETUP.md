# Firestore Schema Setup Guide

Complete guide to initialize your Firestore database schema in production.

## Prerequisites

You need to set up **Google Application Default Credentials** to authenticate with Firebase:

### Option 1: Firebase Service Account (Recommended)

1. **Download service account key:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project `unio-9ddf7`
   - Navigate to **Settings** (⚙️) → **Service Accounts**
   - Click **Generate New Private Key**
   - Save the JSON file securely

2. **Set environment variable:**
   ```bash
   # Windows (PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account-key.json"

   # Windows (Command Prompt)
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json

   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **Verify setup:**
   ```bash
   echo $env:GOOGLE_APPLICATION_CREDENTIALS  # PowerShell
   echo $GOOGLE_APPLICATION_CREDENTIALS      # Bash
   ```

### Option 2: Application Default Credentials (gcloud)

```bash
# Install Google Cloud SDK from: https://cloud.google.com/sdk/docs/install
gcloud auth application-default login
```

---

## Create Firestore Schema

### Step 1: Ensure Environment Variables Are Set

```bash
# Check these are configured in .env.local:
FIREBASE_PROJECT_ID=unio-9ddf7
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

### Step 2: Run Schema Creation

```bash
# Install dependencies (if not already done)
npm install

# Create the Firestore schema in production
npm run firebase:schema
```

### What This Does

The script will:
✅ Create 9 root collections:
- `events` - Event listings
- `studentRegistrations` - User event registrations
- `users` - User profiles
- `challenges` - Coding problems
- `teams` - Team management
- `teamRequests` - Open team join requests
- `forumThreads` - Discussion forum
- `learningPaths` - Structured courses
- `contests` - Coding contests

✅ Create all sub-collections (15 more):
- Per-event: registrations, reviews
- Per-user: submissions, bookmarks, notifications, activityFeed, achievements
- Per-team: messages, requests, presence, typing
- Per-challenge: discussions
- Per-forum: replies
- Per-learning-path: enrollments
- Per-contest: leaderboard

✅ Add sample data for testing

✅ Apply Firestore security rules

---

## Expected Output

```
📋 Creating Firestore Schema...
- Project: unio-9ddf7
- Target: production

📦 Creating 'events' (4 docs)...
✅ Created 'events' (4 documents).
  ✓ registrations (2 docs)
  ✓ reviews (2 docs)

📦 Creating 'studentRegistrations' (3 docs)...
✅ Created 'studentRegistrations' (3 documents).

📦 Creating 'users' (2 docs)...
✅ Created 'users' (2 documents).
  ✓ submissions (1 docs)
  ✓ bookmarks (2 docs)
  ✓ notifications (1 docs)
  ✓ activityFeed (1 docs)
  ✓ achievements (1 docs)

[... more collections ...]

✨ Firestore schema created successfully!

📊 Summary:
   ✓ 9 root collections
   ✓ 24 total collections (including sub-collections)
   ✓ Sample data for testing
   ✓ All security rules applied

💡 Next steps:
   1. Review data in Firebase Console
   2. Test queries with your app
   3. Adjust sample data as needed
```

---

## Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project `unio-9ddf7`
3. Navigate to **Firestore Database**
4. You should see all collections listed:
   - `challenges`
   - `contests`
   - `events`
   - `forumThreads`
   - `learningPaths`
   - `studentRegistrations`
   - `teams`
   - `teamRequests`
   - `users`

---

## Collection Schemas

### Event Registration Example

When a user registers for an event, data is stored in:

**1. Event subcollection:**
```
events/event-1/registrations/user-1
├── userId: "user-1"
├── eventId: "event-1"
├── eventTitle: "Web Development Hackathon 2024"
├── teamId: "team-101" (or null if solo)
├── registeredAt: Timestamp
└── status: "registered"
```

**2. Central registration index:**
```
studentRegistrations/user-1_event-1
├── userId: "user-1"
├── eventId: "event-1"
├── eventTitle: "Web Development Hackathon 2024"
├── teamId: "team-101"
├── registeredAt: Timestamp
└── status: "registered"
```

---

## Data Relationships

```
User (users/{userId})
  └── Events Registered (studentRegistrations/{userId}_{eventId})
  └── Teams Joined (teams/{teamId})
  └── Submissions (users/{userId}/submissions)
  └── Bookmarks (users/{userId}/bookmarks)
  └── Notifications (users/{userId}/notifications)

Event (events/{eventId})
  └── Registrations (events/{eventId}/registrations/{userId})
  └── Reviews (events/{eventId}/reviews/{reviewId})

Team (teams/{teamId})
  └── Messages (teams/{teamId}/messages)
  └── Join Requests (teams/{teamId}/requests)
  └── User Presence (teams/{teamId}/presence)
  └── Typing Status (teams/{teamId}/typing)

Challenge (challenges/{challengeId})
  └── Discussions (challenges/{challengeId}/discussions)

Forum Thread (forumThreads/{threadId})
  └── Replies (forumThreads/{threadId}/replies)

Learning Path (learningPaths/{pathId})
  └── User Enrollments (learningPaths/{pathId}/enrollments/{userId})

Contest (contests/{contestId})
  └── Leaderboard (contests/{contestId}/leaderboard/{userId})
```

---

## Troubleshooting

### Error: "Cannot find module 'firebase-admin/app'"

```bash
npm install
```

### Error: "GOOGLE_APPLICATION_CREDENTIALS not set"

Make sure you've set the environment variable correctly:

```bash
# PowerShell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\key.json"
npm run firebase:schema

# Command Prompt
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\key.json
npm run firebase:schema

# Bash/Terminal
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
npm run firebase:schema
```

### Error: "Permission denied" or "Insufficient permissions"

Ensure your service account has:
- **Cloud Datastore User** role
- **Editor** role (for testing)

Go to [Google Cloud IAM](https://console.cloud.google.com/iam-admin) and update roles.

### Error: "Project not found"

Verify `FIREBASE_PROJECT_ID` matches your Firebase project:
```bash
echo $env:FIREBASE_PROJECT_ID  # Should be: unio-9ddf7
```

---

## Running the Seed Script (Alternative)

If you prefer to seed with your custom data:

```bash
npm run seed
```

This uses `scripts/seed-firebase.ts` to seed events and challenges from your static data.

---

## Security Rules

All collections are protected with Firestore Security Rules in `firestore.rules`:

✅ Users can only read/write their own data
✅ Admins can manage all data
✅ Public read access for events, challenges, forum
✅ Authenticated users required for most operations

---

## Next Steps

1. ✅ Run the schema creation script
2. ✅ Verify data in Firebase Console
3. ✅ Test registration flow in your app
4. ✅ Check database rules are applied

See `FIRESTORE_SCHEMA.md` and `FIRESTORE_QUICK_REFERENCE.md` for complete schema documentation.
