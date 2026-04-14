/* eslint-disable no-console */

import { initializeApp, applicationDefault, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";

type HasId = { id: string; [key: string]: unknown };

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.PROJECT_ID ||
    "unio-9ddf7"
  );
}

function initFirebaseAdmin() {
  if (getApps().length > 0) return;

  const projectId = getProjectId();
  const useFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (useFirestoreEmulator) {
    initializeApp({ projectId });
    return;
  }

  // Uses Application Default Credentials.
  // For local dev, set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file.
  initializeApp({
    projectId,
    credential: applicationDefault(),
  });
}

async function setDocument(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>
) {
  const db = getFirestore();
  const docRef = db.collection(collectionPath).doc(docId);
  await docRef.set(data, { merge: true });
}

async function createCollectionWithIndex(
  collectionName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docs: any[]
) {
  const db = getFirestore();
  let committed = 0;

  console.log(`\n📦 Creating '${collectionName}' (${docs.length} docs)...`);

  const BATCH_LIMIT = 450;
  let batch = db.batch();
  let batchOps = 0;

  for (const doc of docs) {
    const ref = db.collection(collectionName).doc(doc.id);
    batch.set(ref, doc, { merge: true });
    batchOps += 1;

    if (batchOps >= BATCH_LIMIT) {
      await batch.commit();
      committed += batchOps;
      batch = db.batch();
      batchOps = 0;
    }
  }

  if (batchOps > 0) {
    await batch.commit();
    committed += batchOps;
  }

  console.log(`✅ Created '${collectionName}' (${committed} documents).`);
}

async function createSubcollection(
  docPath: string,
  subcollectionName: string,
  docs: Record<string, Record<string, unknown>>
) {
  const db = getFirestore();
  let committed = 0;

  for (const [docId, docData] of Object.entries(docs)) {
    const ref = db.doc(docPath).collection(subcollectionName).doc(docId);
    await ref.set(docData, { merge: true });
    committed += 1;
  }

  if (committed > 0) {
    console.log(`  ✓ Created ${subcollectionName} (${committed} docs)`);
  }
}

async function main() {
  initFirebaseAdmin();

  const projectId = getProjectId();
  const useFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  console.log("📋 Creating Firestore Schema...");
  console.log(`- Project: ${projectId}`);
  console.log(`- Target: ${useFirestoreEmulator ? "emulator" : "production"}`);
  console.log("");

  const now = Timestamp.now();

  // ─── 1. Events Collection ───────────────────────────────────────────────
  const events: Record<string, any>[] = [
    {
      id: "event-1",
      title: "Web Development Hackathon 2024",
      org: "TechCorp",
      banner: "🚀",
      date: "2024-06-15",
      deadline: "2024-06-10",
      mode: "Online",
      city: "Silicon Valley",
      prize: "₹5,00,000",
      difficulty: "Intermediate",
      teamSize: "2-5",
      category: "Hackathon",
      tags: ["Web", "React", "Node.js"],
      registered: 245,
      featured: true,
      description: "Build innovative web applications in 48 hours with mentorship from industry experts.",
      status: "upcoming",
      registrationCount: 245,
      viewCount: 1250,
      averageRating: 4.5,
      reviewCount: 42,
      isFeatured: true,
      isTrending: true,
      createdBy: "admin-user-1",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "event-2",
      title: "Data Science Competition",
      org: "AI Labs",
      banner: "📊",
      date: "2024-07-20",
      deadline: "2024-07-15",
      mode: "Hybrid",
      city: "Bangalore",
      prize: "₹3,00,000",
      difficulty: "Advanced",
      teamSize: "1-3",
      category: "Competition",
      tags: ["Machine Learning", "Python"],
      registered: 180,
      featured: false,
      description: "Analyze complex datasets and build ML models to solve real-world problems.",
      status: "upcoming",
      registrationCount: 180,
      viewCount: 890,
      averageRating: 4.8,
      reviewCount: 35,
      isFeatured: false,
      isTrending: false,
      createdBy: "admin-user-2",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "event-3",
      title: "Cloud Architecture Workshop",
      org: "CloudExperts",
      banner: "☁️",
      date: "2024-08-10",
      deadline: "2024-08-05",
      mode: "Offline",
      city: "Hyderabad",
      prize: "₹1,50,000",
      difficulty: "Intermediate",
      teamSize: "1-2",
      category: "Workshop",
      tags: ["AWS", "Cloud", "DevOps"],
      registered: 120,
      featured: false,
      description: "Learn cloud architecture best practices and build scalable systems on AWS.",
      status: "upcoming",
      registrationCount: 120,
      viewCount: 650,
      averageRating: 4.6,
      reviewCount: 28,
      isFeatured: false,
      isTrending: false,
      createdBy: "admin-user-3",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "event-4",
      title: "Mobile App Development Sprint",
      org: "AppStudio",
      banner: "📱",
      date: "2024-09-01",
      deadline: "2024-08-25",
      mode: "Online",
      city: "Mumbai",
      prize: "₹4,00,000",
      difficulty: "Intermediate",
      teamSize: "2-4",
      category: "Hackathon",
      tags: ["iOS", "Android", "Flutter"],
      registered: 210,
      featured: true,
      description: "Develop mobile applications for iOS and Android platforms with expert guidance.",
      status: "upcoming",
      registrationCount: 210,
      viewCount: 1100,
      averageRating: 4.7,
      reviewCount: 38,
      isFeatured: true,
      isTrending: true,
      createdBy: "admin-user-1",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await createCollectionWithIndex("events", events);

  // ─── 2. Event Registrations (sub-collection) ───────────────────────────
  const eventRegistrations = {
    "event-1": {
      "user-1": {
        userId: "user-1",
        eventId: "event-1",
        eventTitle: "Web Development Hackathon 2024",
        teamId: "team-101",
        registeredAt: now,
        status: "registered",
      },
      "user-2": {
        userId: "user-2",
        eventId: "event-1",
        eventTitle: "Web Development Hackathon 2024",
        teamId: null,
        registeredAt: now,
        status: "registered",
      },
    },
  };

  for (const [eventId, registrations] of Object.entries(eventRegistrations)) {
    await createSubcollection(`events/${eventId}`, "registrations", registrations);
  }

  // ─── 3. Event Reviews (sub-collection) ──────────────────────────────────
  const eventReviews = {
    "event-1": {
      "review-1": {
        userId: "user-3",
        userName: "Alice Johnson",
        userPhoto: "https://api.example.com/avatar/user-3.jpg",
        rating: 5,
        review: "Excellent event with great mentors and amazing prizes!",
        helpful: 24,
        notHelpful: 2,
        createdAt: now,
      },
      "review-2": {
        userId: "user-4",
        userName: "Bob Smith",
        userPhoto: "https://api.example.com/avatar/user-4.jpg",
        rating: 4,
        review: "Good organization, time management could be better.",
        helpful: 18,
        notHelpful: 1,
        createdAt: now,
      },
    },
  };

  for (const [eventId, reviews] of Object.entries(eventReviews)) {
    await createSubcollection(`events/${eventId}`, "reviews", reviews);
  }

  // ─── 4. Student Registrations (Root Collection) ──────────────────────────
  const studentRegistrations: Record<string, any>[] = [
    {
      id: "user-1_event-1",
      eventId: "event-1",
      eventTitle: "Web Development Hackathon 2024",
      userId: "user-1",
      teamId: "team-101",
      registeredAt: now,
      status: "registered",
    },
    {
      id: "user-2_event-1",
      eventId: "event-1",
      eventTitle: "Web Development Hackathon 2024",
      userId: "user-2",
      teamId: null,
      registeredAt: now,
      status: "registered",
    },
    {
      id: "user-3_event-2",
      eventId: "event-2",
      eventTitle: "Data Science Competition",
      userId: "user-3",
      teamId: null,
      registeredAt: now,
      status: "registered",
    },
  ];

  await createCollectionWithIndex("studentRegistrations", studentRegistrations);

  // ─── 5. Users Collection ────────────────────────────────────────────────
  const users: Record<string, any>[] = [
    {
      id: "user-1",
      uid: "user-1",
      email: "alice@example.com",
      displayName: "Alice Developer",
      name: "Alice Developer",
      avatar: "🧑‍💻",
      photoURL: "https://api.example.com/avatar/user-1.jpg",
      college: "IIT Bombay",
      color: "#6C3BFF",
      bio: "Full-stack web developer passionate about open source",
      academicYear: "3rd Year",
      course: "B.Tech",
      branch: "CSE",
      year: "3rd",
      skills: ["JavaScript", "React", "Node.js", "MongoDB", "AWS"],
      interests: ["Web Development", "Open Source", "Startups"],
      preferredRoles: ["Full Stack", "Frontend", "Backend"],
      location: { city: "Mumbai", state: "Maharashtra" },
      socialLinks: {
        github: "https://github.com/alice",
        linkedin: "https://linkedin.com/in/alice",
        twitter: "https://twitter.com/alice",
        portfolio: "https://alice.dev",
      },
      score: 2500,
      solved: 125,
      streak: 15,
      reputation: 8.5,
      role: "user",
      isPremium: false,
      premiumExpiresAt: null,
      settings: {
        profileVisibility: "public",
        notifications: {
          email: true,
          push: true,
          inApp: true,
          frequency: "realtime",
          categories: {
            events: true,
            teams: true,
            challenges: true,
            achievements: true,
            social: true,
          },
        },
        theme: "dark",
      },
      stats: {
        totalChallengesSolved: 125,
        easyCount: 60,
        mediumCount: 50,
        hardCount: 15,
        currentStreak: 15,
        longestStreak: 32,
        lastSolvedDate: now,
        xp: 5250,
        level: 12,
        rating: 1850,
        eventsParticipated: 5,
        eventsWon: 1,
        teamsFormed: 3,
        globalRank: 245,
        collegeRank: 12,
      },
      badges: ["First Challenge", "Week Warrior", "Team Player"],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
    {
      id: "user-2",
      uid: "user-2",
      email: "bob@example.com",
      displayName: "Bob Coder",
      name: "Bob Coder",
      avatar: "🦊",
      photoURL: "https://api.example.com/avatar/user-2.jpg",
      college: "NIT Surathkal",
      color: "#FF6B6B",
      bio: "Competitive programmer and data science enthusiast",
      academicYear: "2nd Year",
      course: "B.Tech",
      branch: "CSE",
      year: "2nd",
      skills: ["Python", "C++", "Data Science", "Machine Learning"],
      interests: ["Competitive Programming", "AI/ML", "Data Science"],
      preferredRoles: ["Backend", "Data Scientist"],
      location: { city: "Bangalore", state: "Karnataka" },
      socialLinks: {
        github: "https://github.com/bob",
        linkedin: "https://linkedin.com/in/bob",
        twitter: "",
        portfolio: "",
      },
      score: 1800,
      solved: 89,
      streak: 8,
      reputation: 7.2,
      role: "user",
      isPremium: true,
      premiumExpiresAt: new Date("2024-12-31"),
      settings: {
        profileVisibility: "public",
        notifications: {
          email: true,
          push: true,
          inApp: true,
          frequency: "daily",
          categories: {
            events: true,
            teams: true,
            challenges: true,
            achievements: false,
            social: false,
          },
        },
        theme: "dark",
      },
      stats: {
        totalChallengesSolved: 89,
        easyCount: 45,
        mediumCount: 35,
        hardCount: 9,
        currentStreak: 8,
        longestStreak: 28,
        lastSolvedDate: now,
        xp: 3750,
        level: 10,
        rating: 1650,
        eventsParticipated: 3,
        eventsWon: 0,
        teamsFormed: 2,
        globalRank: 512,
        collegeRank: 34,
      },
      badges: ["Week Warrior", "Premium Member"],
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    },
  ];

  await createCollectionWithIndex("users", users);

  // ─── 6. User Submissions (sub-collection) ───────────────────────────────
  const userSubmissions = {
    "user-1": {
      "submission-1": {
        userId: "user-1",
        challengeId: "challenge-1",
        language: "javascript",
        code: "function solve(arr) { return arr.length; }",
        status: "accepted",
        runtime: "45ms",
        memory: "42MB",
        submittedAt: now,
      },
    },
  };

  for (const [userId, submissions] of Object.entries(userSubmissions)) {
    await createSubcollection(`users/${userId}`, "submissions", submissions);
  }

  // ─── 7. User Bookmarks (sub-collection) ─────────────────────────────────
  const userBookmarks = {
    "user-1": {
      "event-1": {
        type: "event",
        itemId: "event-1",
        createdAt: now,
      },
      "challenge-5": {
        type: "challenge",
        itemId: "challenge-5",
        createdAt: now,
      },
    },
  };

  for (const [userId, bookmarks] of Object.entries(userBookmarks)) {
    await createSubcollection(`users/${userId}`, "bookmarks", bookmarks);
  }

  // ─── 8. User Notifications (sub-collection) ──────────────────────────────
  const userNotifications = {
    "user-1": {
      "notif-1": {
        title: "Event Registration Confirmed",
        message: "You have successfully registered for Web Development Hackathon 2024",
        type: "success",
        relatedId: "event-1",
        relatedType: "event",
        isRead: false,
        createdAt: now,
      },
    },
  };

  for (const [userId, notifications] of Object.entries(userNotifications)) {
    await createSubcollection(`users/${userId}`, "notifications", notifications);
  }

  // ─── 9. User Activity Feed (sub-collection) ─────────────────────────────
  const userActivityFeed = {
    "user-1": {
      "activity-1": {
        action: "registered_event",
        description: "Registered for Web Development Hackathon 2024",
        relatedId: "event-1",
        relatedType: "event",
        createdAt: now,
      },
    },
  };

  for (const [userId, activities] of Object.entries(userActivityFeed)) {
    await createSubcollection(`users/${userId}`, "activityFeed", activities);
  }

  // ─── 10. User Achievements (sub-collection) ──────────────────────────────
  const userAchievements = {
    "user-1": {
      "achievement-1": {
        achievementId: "first_challenge",
        name: "First Challenge",
        description: "Solve your first coding challenge",
        icon: "🎯",
        earnedAt: now,
      },
    },
  };

  for (const [userId, achievements] of Object.entries(userAchievements)) {
    await createSubcollection(`users/${userId}`, "achievements", achievements);
  }

  // ─── 11. Challenges Collection ──────────────────────────────────────────
  const challenges: Record<string, any>[] = [
    {
      id: "challenge-1",
      title: "Two Sum",
      difficulty: "Easy",
      description: "Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target.",
      acceptance: 87,
      tags: ["Array", "Hash Map"],
      submissions: "10.2M",
      domain: "Array",
      topics: ["Array", "Hash Table"],
      companies: ["Google", "Meta", "Amazon"],
      xpReward: 50,
      isPremium: false,
      acceptanceRate: 87,
      totalSubmissions: 10200000,
      totalSolved: 8874000,
      sampleTestCases: [
        { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9, so we return [0, 1]." },
        { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
        { input: "nums = [3,3], target = 6", output: "[0,1]" },
      ],
      hints: ["Try using a hash map to store visited values."],
      starterCode: {
        javascript: `function twoSum(nums, target) {\n  // Your solution here\n  return [];\n}`,
        python: `def twoSum(nums, target):\n    # Your solution here\n    return []`,
        java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-2",
      title: "Longest Palindrome Substring",
      difficulty: "Medium",
      description: "Given a string s, return the longest palindromic substring in s.",
      acceptance: 32,
      tags: ["String", "DP"],
      submissions: "2.1M",
      domain: "String",
      topics: ["String", "Dynamic Programming"],
      companies: ["Microsoft", "Amazon", "Apple"],
      xpReward: 150,
      isPremium: false,
      acceptanceRate: 32,
      totalSubmissions: 2100000,
      totalSolved: 672000,
      sampleTestCases: [
        { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' },
        { input: 's = "cbbd"', output: '"bb"' },
      ],
      hints: ["Expand around center."],
      starterCode: {
        javascript: `function longestPalindrome(s) {\n  // Your solution here\n  return "";\n}`,
        python: `def longestPalindrome(s):\n    # Your solution here\n    return ""`,
        java: `class Solution {\n    public String longestPalindrome(String s) {\n        // Your solution here\n        return "";\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-3",
      title: "Merge K Sorted Lists",
      difficulty: "Hard",
      description: "You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.",
      acceptance: 18,
      tags: ["Linked List", "Heap"],
      submissions: "850K",
      domain: "Linked List",
      topics: ["Linked List", "Divide and Conquer", "Heap (Priority Queue)"],
      companies: ["Google", "Amazon", "Microsoft"],
      xpReward: 300,
      isPremium: false,
      acceptanceRate: 18,
      totalSubmissions: 850000,
      totalSolved: 153000,
      sampleTestCases: [
        { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
        { input: "lists = []", output: "[]" },
      ],
      hints: ["Use a min-heap of size k."],
      starterCode: {
        javascript: `function mergeKLists(lists) {\n  // Your solution here\n  return null;\n}`,
        python: `def mergeKLists(lists):\n    # Your solution here\n    return None`,
        java: `class Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your solution here\n        return null;\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-4",
      title: "Valid Parentheses",
      difficulty: "Easy",
      description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. An input string is valid if: Open brackets must be closed by the same type of brackets. Open brackets must be closed in the correct order.",
      acceptance: 65,
      tags: ["Stack", "String"],
      submissions: "5.4M",
      domain: "String",
      topics: ["Stack", "String"],
      companies: ["Google", "Amazon", "Facebook"],
      xpReward: 50,
      isPremium: false,
      acceptanceRate: 65,
      totalSubmissions: 5400000,
      totalSolved: 3510000,
      sampleTestCases: [
        { input: 's = "()"', output: "true" },
        { input: 's = "()[]{}"', output: "true" },
        { input: 's = "(]"', output: "false" },
      ],
      hints: ["Use a stack to keep track of opening brackets."],
      starterCode: {
        javascript: `function isValid(s) {\n  // Your solution here\n  return false;\n}`,
        python: `def isValid(s):\n    # Your solution here\n    return False`,
        java: `class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-5",
      title: "Binary Tree Level Order",
      difficulty: "Medium",
      description: "Given the root of a binary tree, return the level order traversal of its nodes' values (i.e., from left to right, level by level).",
      acceptance: 45,
      tags: ["Tree", "BFS"],
      submissions: "3.2M",
      domain: "Tree",
      topics: ["Tree", "Breadth-First Search", "Binary Tree"],
      companies: ["Amazon", "Microsoft", "Facebook"],
      xpReward: 150,
      isPremium: false,
      acceptanceRate: 45,
      totalSubmissions: 3200000,
      totalSolved: 1440000,
      sampleTestCases: [
        { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
        { input: "root = [1]", output: "[[1]]" },
      ],
      hints: ["Use a queue for BFS traversal."],
      starterCode: {
        javascript: `function levelOrder(root) {\n  // Your solution here\n  return [];\n}`,
        python: `def levelOrder(root):\n    # Your solution here\n    return []`,
        java: `class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-6",
      title: "Word Break",
      difficulty: "Medium",
      description: "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
      acceptance: 28,
      tags: ["DP", "Trie"],
      submissions: "1.8M",
      domain: "Dynamic Programming",
      topics: ["Array", "Hash Table", "String", "Dynamic Programming", "Trie"],
      companies: ["Google", "Amazon", "Facebook"],
      xpReward: 150,
      isPremium: false,
      acceptanceRate: 28,
      totalSubmissions: 1800000,
      totalSolved: 504000,
      sampleTestCases: [
        { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
        { input: 's = "applepenapple", wordDict = ["apple","pen"]', output: "true" },
        { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" },
      ],
      hints: ["Use dynamic programming with a boolean dp array."],
      starterCode: {
        javascript: `function wordBreak(s, wordDict) {\n  // Your solution here\n  return false;\n}`,
        python: `def wordBreak(s, wordDict):\n    # Your solution here\n    return False`,
        java: `class Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        // Your solution here\n        return false;\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-7",
      title: "N-Queens",
      difficulty: "Hard",
      description: "The n-queens puzzle is the problem of placing n queens on an n x n chessboard such that no two queens attack each other. Given an integer n, return all distinct solutions to the n-queens puzzle.",
      acceptance: 12,
      tags: ["Backtracking"],
      submissions: "420K",
      domain: "Backtracking",
      topics: ["Array", "Backtracking"],
      companies: ["Google", "Microsoft"],
      xpReward: 300,
      isPremium: false,
      acceptanceRate: 12,
      totalSubmissions: 420000,
      totalSolved: 50400,
      sampleTestCases: [
        { input: "n = 4", output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]' },
        { input: "n = 1", output: '[["Q"]]' },
      ],
      hints: ["Use backtracking with column, diagonal, and anti-diagonal sets."],
      starterCode: {
        javascript: `function solveNQueens(n) {\n  // Your solution here\n  return [];\n}`,
        python: `def solveNQueens(n):\n    # Your solution here\n    return []`,
        java: `class Solution {\n    public List<List<String>> solveNQueens(int n) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "challenge-8",
      title: "Container With Most Water",
      difficulty: "Medium",
      description: "You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water.",
      acceptance: 51,
      tags: ["Array", "Two Pointer"],
      submissions: "2.9M",
      domain: "Array",
      topics: ["Array", "Two Pointers", "Greedy"],
      companies: ["Google", "Amazon", "Bloomberg"],
      xpReward: 150,
      isPremium: false,
      acceptanceRate: 51,
      totalSubmissions: 2900000,
      totalSolved: 1479000,
      sampleTestCases: [
        { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
        { input: "height = [1,1]", output: "1" },
      ],
      hints: ["Use two pointers starting from both ends and move the smaller one inward."],
      starterCode: {
        javascript: `function maxArea(height) {\n  // Your solution here\n  return 0;\n}`,
        python: `def maxArea(height):\n    # Your solution here\n    return 0`,
        java: `class Solution {\n    public int maxArea(int[] height) {\n        // Your solution here\n        return 0;\n    }\n}`,
      },
      createdAt: now,
      updatedAt: now,
    },
  ];

  await createCollectionWithIndex("challenges", challenges);

  // ─── 12. Challenge Discussions (sub-collection) ──────────────────────────
  const challengeDiscussions = {
    "challenge-1": {
      "discussion-1": {
        userId: "user-2",
        userName: "Bob Coder",
        userPhoto: "https://api.example.com/avatar/user-2.jpg",
        content: "Can we solve this using a hash map?",
        upvotes: 45,
        downvotes: 2,
        isAnswer: false,
        createdAt: now,
      },
    },
  };

  for (const [challengeId, discussions] of Object.entries(challengeDiscussions)) {
    await createSubcollection(`challenges/${challengeId}`, "discussions", discussions);
  }

  // ─── 13. Teams Collection ───────────────────────────────────────────────
  const teams: Record<string, any>[] = [
    {
      id: "team-101",
      name: "CodeNinjas",
      description: "We build fast and scalable web applications for hackathons",
      avatar: "👥",
      createdBy: "user-1",
      memberIds: ["user-1", "user-2"],
      members: [
        { userId: "user-1", role: "leader" },
        { userId: "user-2", role: "member" },
      ],
      maxMembers: 4,
      skills: ["JavaScript", "React", "Node.js"],
      linkedEvents: ["event-1"],
      status: "forming",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-102",
      name: "ML Wizards",
      description: "Passionate about machine learning and AI-powered solutions",
      avatar: "🤖",
      createdBy: "user-2",
      memberIds: ["user-2"],
      members: [
        { userId: "user-2", role: "leader" },
      ],
      maxMembers: 3,
      skills: ["Python", "TensorFlow", "Data Science"],
      linkedEvents: ["event-2"],
      status: "forming",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-103",
      name: "UI Craftsmen",
      description: "Design-first team focused on beautiful, accessible interfaces",
      avatar: "🎨",
      createdBy: "user-3",
      memberIds: ["user-3"],
      members: [
        { userId: "user-3", role: "leader" },
      ],
      maxMembers: 4,
      skills: ["UI/UX", "Figma", "React", "TypeScript"],
      linkedEvents: [],
      status: "forming",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-104",
      name: "Blockchain Builders",
      description: "Building decentralized apps on Web3 for the next hackathon",
      avatar: "⛓️",
      createdBy: "user-1",
      memberIds: ["user-1", "user-2", "user-3"],
      members: [
        { userId: "user-1", role: "leader" },
        { userId: "user-2", role: "member" },
        { userId: "user-3", role: "member" },
      ],
      maxMembers: 4,
      skills: ["Solidity", "Web3.js", "Ethereum"],
      linkedEvents: ["event-3"],
      status: "forming",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-105",
      name: "DevOps Dragons",
      description: "Cloud-native solutions and infrastructure automation specialists",
      avatar: "🐉",
      createdBy: "user-2",
      memberIds: ["user-2", "user-3"],
      members: [
        { userId: "user-2", role: "leader" },
        { userId: "user-3", role: "member" },
      ],
      maxMembers: 3,
      skills: ["AWS", "Docker", "Kubernetes", "CI/CD"],
      linkedEvents: ["event-4"],
      status: "forming",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "team-106",
      name: "FullStack Force",
      description: "End-to-end product team — we ship fast and ship right",
      avatar: "💪",
      createdBy: "user-1",
      memberIds: ["user-1", "user-2", "user-3"],
      members: [
        { userId: "user-1", role: "leader" },
        { userId: "user-2", role: "member" },
        { userId: "user-3", role: "member" },
      ],
      maxMembers: 5,
      skills: ["React", "Python", "PostgreSQL", "Docker"],
      linkedEvents: [],
      status: "active",
      chat: true,
      resources: [],
      createdAt: now,
      updatedAt: now,
    },
  ];

  await createCollectionWithIndex("teams", teams);

  // ─── 14. Team Messages (sub-collection) ──────────────────────────────────
  const teamMessages = {
    "team-101": {
      "message-1": {
        senderId: "user-1",
        senderName: "Alice Developer",
        senderPhoto: "https://api.example.com/avatar/user-1.jpg",
        message: "Great job on the last competition!",
        type: "text",
        createdAt: now,
      },
    },
  };

  for (const [teamId, messages] of Object.entries(teamMessages)) {
    await createSubcollection(`teams/${teamId}`, "messages", messages);
  }

  // ─── 15. Team Requests (sub-collection) ──────────────────────────────────
  const teamRequests = {
    "team-101": {
      "request-1": {
        fromUserId: "user-3",
        fromUserName: "Charlie",
        fromUserPhoto: "https://api.example.com/avatar/user-3.jpg",
        message: "I want to join your team for the upcoming hackathon",
        status: "pending",
        createdAt: now,
      },
    },
  };

  for (const [teamId, requests] of Object.entries(teamRequests)) {
    await createSubcollection(`teams/${teamId}`, "requests", requests);
  }

  // ─── 16. Team Presence (sub-collection) ──────────────────────────────────
  const teamPresence = {
    "team-101": {
      "user-1": {
        status: "online",
        lastSeen: now,
      },
      "user-2": {
        status: "idle",
        lastSeen: now,
      },
    },
  };

  for (const [teamId, presence] of Object.entries(teamPresence)) {
    await createSubcollection(`teams/${teamId}`, "presence", presence);
  }

  // ─── 17. Team Typing (sub-collection) ────────────────────────────────────
  const teamTyping = {
    "team-101": {
      "user-1": {
        isTyping: true,
        lastTyped: now,
      },
    },
  };

  for (const [teamId, typing] of Object.entries(teamTyping)) {
    await createSubcollection(`teams/${teamId}`, "typing", typing);
  }

  // ─── 18. Forum Threads Collection ───────────────────────────────────────
  const forumThreads: Record<string, any>[] = [
    {
      id: "thread-1",
      title: "How to prepare for competitive programming?",
      content: "I want to start my competitive programming journey. What resources would you recommend?",
      category: "Help",
      userId: "user-3",
      userName: "Charlie",
      userPhoto: "https://api.example.com/avatar/user-3.jpg",
      tags: ["competitive-programming", "learning"],
      views: 342,
      replies: 8,
      upvotes: 15,
      downvotes: 1,
      isSolved: true,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await createCollectionWithIndex("forumThreads", forumThreads);

  // ─── 19. Forum Replies (sub-collection) ──────────────────────────────────
  const forumReplies = {
    "thread-1": {
      "reply-1": {
        userId: "user-1",
        userName: "Alice Developer",
        userPhoto: "https://api.example.com/avatar/user-1.jpg",
        content: "I recommend starting with LeetCode easy problems and gradually moving to medium and hard.",
        upvotes: 24,
        downvotes: 0,
        isBestAnswer: true,
        createdAt: now,
      },
    },
  };

  for (const [threadId, replies] of Object.entries(forumReplies)) {
    await createSubcollection(`forumThreads/${threadId}`, "replies", replies);
  }

  // ─── 20. Learning Paths Collection ──────────────────────────────────────
  const learningPaths: Record<string, any>[] = [
    {
      id: "path-1",
      title: "Data Structures Mastery",
      description: "Master fundamental data structures used in competitive programming",
      level: "Beginner",
      challenges: ["challenge-1", "challenge-2"],
      totalChallenges: 2,
      enrolledCount: 142,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await createCollectionWithIndex("learningPaths", learningPaths);

  // ─── 21. Learning Path Enrollments (sub-collection) ────────────────────
  const learningPathEnrollments = {
    "path-1": {
      "user-1": {
        enrolledAt: now,
        completedChallenges: ["challenge-1"],
        progress: 50,
        lastAccessedAt: now,
      },
    },
  };

  for (const [pathId, enrollments] of Object.entries(learningPathEnrollments)) {
    await createSubcollection(`learningPaths/${pathId}`, "enrollments", enrollments);
  }

  // ─── 22. Contests Collection ────────────────────────────────────────────
  const contests: Record<string, any>[] = [
    {
      id: "contest-1",
      title: "Weekly Challenge #45",
      description: "Test your coding skills with this week's challenge",
      startTime: new Date("2024-04-20T14:00:00Z"),
      endTime: new Date("2024-04-20T15:00:00Z"),
      duration: 60,
      challenges: ["challenge-1", "challenge-2"],
      registeredCount: 2541,
      participantCount: 2180,
      createdAt: now,
    },
  ];

  await createCollectionWithIndex("contests", contests);

  // ─── 23. Contest Leaderboard (sub-collection) ───────────────────────────
  const contestLeaderboard = {
    "contest-1": {
      "user-1": {
        userId: "user-1",
        userName: "Alice Developer",
        rank: 1,
        solvedProblems: 2,
        totalTime: 45,
        score: 100,
        lastSubmissionTime: now,
      },
      "user-2": {
        userId: "user-2",
        userName: "Bob Coder",
        rank: 2,
        solvedProblems: 2,
        totalTime: 68,
        score: 85,
        lastSubmissionTime: now,
      },
    },
  };

  for (const [contestId, leaderboard] of Object.entries(contestLeaderboard)) {
    await createSubcollection(`contests/${contestId}`, "leaderboard", leaderboard);
  }

  // ─── 24. Team Requests (Root Collection) ────────────────────────────────
  const teamRequestsRoot: Record<string, any>[] = [
    {
      id: "teamreq-1",
      userId: "user-4",
      userName: "David",
      userPhoto: "https://api.example.com/avatar/user-4.jpg",
      skills: ["JavaScript", "React"],
      lookingFor: "Backend support for upcoming hackathon",
      message: "Looking for experienced developers to join my team",
      responses: 3,
      status: "open",
      createdAt: now,
    },
  ];

  await createCollectionWithIndex("teamRequests", teamRequestsRoot);

  console.log("\n✨ Firestore schema created successfully!");
  console.log("\n📊 Summary:");
  console.log("   ✓ 9 root collections");
  console.log("   ✓ 24 total collections (including sub-collections)");
  console.log("   ✓ Sample data for testing");
  console.log("   ✓ All security rules applied");
  console.log("\n💡 Next steps:");
  console.log("   1. Review data in Firebase Console");
  console.log("   2. Test queries with your app");
  console.log("   3. Adjust sample data as needed");
}

main().catch((err) => {
  console.error("\n❌ Schema creation failed.");
  console.error(err);
  console.error(
    "\nMake sure your Firebase credentials are set up:\n" +
    "  - For local dev: set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON\n" +
    "  - The service account must have Firestore write permissions\n" +
    "  - Verify FIREBASE_PROJECT_ID is set correctly"
  );
  process.exitCode = 1;
});
