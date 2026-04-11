import type { Challenge } from "@/types";

export const CHALLENGES: Challenge[] = [
  { id: "challenge-1", title: "Two Sum", difficulty: "Easy", acceptance: 87, tags: ["Array", "Hash Map"], solved: true, submissions: "10.2M" },
  { id: "challenge-2", title: "Longest Palindrome Substring", difficulty: "Medium", acceptance: 32, tags: ["String", "DP"], solved: false, submissions: "2.1M" },
  { id: "challenge-3", title: "Merge K Sorted Lists", difficulty: "Hard", acceptance: 18, tags: ["Linked List", "Heap"], solved: false, submissions: "850K" },
  { id: "challenge-4", title: "Valid Parentheses", difficulty: "Easy", acceptance: 65, tags: ["Stack", "String"], solved: true, submissions: "5.4M" },
  { id: "challenge-5", title: "Binary Tree Level Order", difficulty: "Medium", acceptance: 45, tags: ["Tree", "BFS"], solved: true, submissions: "3.2M" },
  { id: "challenge-6", title: "Word Break", difficulty: "Medium", acceptance: 28, tags: ["DP", "Trie"], solved: false, submissions: "1.8M" },
  { id: "challenge-7", title: "N-Queens", difficulty: "Hard", acceptance: 12, tags: ["Backtracking"], solved: false, submissions: "420K" },
  { id: "challenge-8", title: "Container With Most Water", difficulty: "Medium", acceptance: 51, tags: ["Array", "Two Pointer"], solved: true, submissions: "2.9M" },
];
