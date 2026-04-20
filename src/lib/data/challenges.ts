import type { Challenge } from "@/types";

export const CHALLENGES: Challenge[] = [
  // ─── Easy ─────────────────────────────────────────────────────────────────────
  {
    id: "challenge-1", title: "Two Sum", difficulty: "Easy", acceptance: 87,
    tags: ["Array", "Hash Table"], submissions: "10.2M", xpReward: 10,
    description: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    constraints: "2 ≤ nums.length ≤ 10⁴\n-10⁹ ≤ nums[i] ≤ 10⁹\nOnly one valid answer exists.",
    sampleTestCases: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] == 9" },
      { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
      { input: "nums = [3,3], target = 6", output: "[0,1]" },
    ],
    starterCode: {
      javascript: `function twoSum(nums, target) {\n  // Your solution here\n}`,
      python: `def twoSum(nums, target):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  {
    id: "challenge-4", title: "Valid Parentheses", difficulty: "Easy", acceptance: 65,
    tags: ["Stack", "String"], submissions: "5.4M", xpReward: 10,
    description: "Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.",
    constraints: "1 ≤ s.length ≤ 10⁴\ns consists of parentheses only.",
    sampleTestCases: [
      { input: 's = "()"', output: "true" },
      { input: 's = "()[]{}"', output: "true" },
      { input: 's = "(]"', output: "false" },
    ],
    starterCode: {
      javascript: `function isValid(s) {\n  // Your solution here\n}`,
      python: `def isValid(s):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
      "c++": `#include <string>\n#include <stack>\nusing namespace std;\n\nbool isValid(string s) {\n    // Your solution here\n    return false;\n}`,
    },
  },
  {
    id: "challenge-9", title: "Reverse String", difficulty: "Easy", acceptance: 92,
    tags: ["String", "Two Pointer"], submissions: "4.1M", xpReward: 10,
    description: "Write a function that reverses a string. The input string is given as an array of characters. You must do this by modifying the input array in-place with O(1) extra memory.",
    constraints: "1 ≤ s.length ≤ 10⁵\ns[i] is a printable ASCII character.",
    sampleTestCases: [
      { input: 's = ["h","e","l","l","o"]', output: '["o","l","l","e","h"]' },
      { input: 's = ["H","a","n","n","a","h"]', output: '["h","a","n","n","a","H"]' },
    ],
    starterCode: {
      javascript: `function reverseString(s) {\n  // Modify s in-place\n}`,
      python: `def reverseString(s):\n    # Modify s in-place\n    pass`,
      java: `class Solution {\n    public void reverseString(char[] s) {\n        // Modify s in-place\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nvoid reverseString(vector<char>& s) {\n    // Modify s in-place\n}`,
    },
  },
  {
    id: "challenge-10", title: "Maximum Subarray", difficulty: "Easy", acceptance: 70,
    tags: ["Array", "Dynamic Programming"], submissions: "6.8M", xpReward: 10,
    description: "Given an integer array nums, find the subarray with the largest sum, and return its sum.",
    constraints: "1 ≤ nums.length ≤ 10⁵\n-10⁴ ≤ nums[i] ≤ 10⁴",
    sampleTestCases: [
      { input: "nums = [-2,1,-3,4,-1,2,1,-5,4]", output: "6", explanation: "[4,-1,2,1] has the largest sum 6." },
      { input: "nums = [1]", output: "1" },
      { input: "nums = [5,4,-1,7,8]", output: "23" },
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n  // Your solution here\n}`,
      python: `def maxSubArray(nums):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int maxSubArray(int[] nums) {\n        // Your solution here\n        return 0;\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    // Your solution here\n    return 0;\n}`,
    },
  },
  {
    id: "challenge-11", title: "Palindrome Number", difficulty: "Easy", acceptance: 82,
    tags: ["Math"], submissions: "7.5M", xpReward: 10,
    description: "Given an integer x, return true if x is a palindrome, and false otherwise.",
    constraints: "-2³¹ ≤ x ≤ 2³¹ - 1",
    sampleTestCases: [
      { input: "x = 121", output: "true", explanation: "121 reads the same forward and backward." },
      { input: "x = -121", output: "false" },
      { input: "x = 10", output: "false" },
    ],
    starterCode: {
      javascript: `function isPalindrome(x) {\n  // Your solution here\n}`,
      python: `def isPalindrome(x):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public boolean isPalindrome(int x) {\n        // Your solution here\n        return false;\n    }\n}`,
      "c++": `bool isPalindrome(int x) {\n    // Your solution here\n    return false;\n}`,
    },
  },
  {
    id: "challenge-12", title: "Fizz Buzz", difficulty: "Easy", acceptance: 90,
    tags: ["Math", "String", "Simulation"], submissions: "3.2M", xpReward: 10,
    description: 'Given an integer n, return a string array answer where: answer[i] == "FizzBuzz" if i is divisible by 3 and 5, "Fizz" if divisible by 3, "Buzz" if divisible by 5, or i (as a string) otherwise.',
    constraints: "1 ≤ n ≤ 10⁴",
    sampleTestCases: [
      { input: "n = 3", output: '["1","2","Fizz"]' },
      { input: "n = 5", output: '["1","2","Fizz","4","Buzz"]' },
    ],
    starterCode: {
      javascript: `function fizzBuzz(n) {\n  // Your solution here\n}`,
      python: `def fizzBuzz(n):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<String> fizzBuzz(int n) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      "c++": `#include <vector>\n#include <string>\nusing namespace std;\n\nvector<string> fizzBuzz(int n) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  // ─── Medium ───────────────────────────────────────────────────────────────────
  {
    id: "challenge-2", title: "Longest Palindromic Substring", difficulty: "Medium", acceptance: 32,
    tags: ["String", "Dynamic Programming"], submissions: "2.1M", xpReward: 20,
    description: "Given a string s, return the longest palindromic substring in s.",
    constraints: "1 ≤ s.length ≤ 1000\ns consist of only digits and English letters.",
    sampleTestCases: [
      { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' },
      { input: 's = "cbbd"', output: '"bb"' },
    ],
    starterCode: {
      javascript: `function longestPalindrome(s) {\n  // Your solution here\n}`,
      python: `def longestPalindrome(s):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public String longestPalindrome(String s) {\n        // Your solution here\n        return "";\n    }\n}`,
      "c++": `#include <string>\nusing namespace std;\n\nstring longestPalindrome(string s) {\n    // Your solution here\n    return "";\n}`,
    },
  },
  {
    id: "challenge-5", title: "Binary Tree Level Order", difficulty: "Medium", acceptance: 45,
    tags: ["Tree", "BFS"], submissions: "3.2M", xpReward: 20,
    description: "Given the root of a binary tree, return the level order traversal of its nodes' values (from left to right, level by level).",
    constraints: "0 ≤ Number of nodes ≤ 2000\n-1000 ≤ Node.val ≤ 1000",
    sampleTestCases: [
      { input: "root = [3,9,20,null,null,15,7]", output: "[[3],[9,20],[15,7]]" },
      { input: "root = [1]", output: "[[1]]" },
    ],
    starterCode: {
      javascript: `function levelOrder(root) {\n  // Your solution here\n}`,
      python: `def levelOrder(root):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      "c++": `#include <vector>\n#include <queue>\nusing namespace std;\n\nvector<vector<int>> levelOrder(TreeNode* root) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  {
    id: "challenge-6", title: "Word Break", difficulty: "Medium", acceptance: 28,
    tags: ["DP", "Trie"], submissions: "1.8M", xpReward: 20,
    description: "Given a string s and a dictionary of strings wordDict, return true if s can be segmented into a space-separated sequence of one or more dictionary words.",
    constraints: "1 ≤ s.length ≤ 300\n1 ≤ wordDict.length ≤ 1000",
    sampleTestCases: [
      { input: 's = "leetcode", wordDict = ["leet","code"]', output: "true" },
      { input: 's = "applepenapple", wordDict = ["apple","pen"]', output: "true" },
      { input: 's = "catsandog", wordDict = ["cats","dog","sand","and","cat"]', output: "false" },
    ],
    starterCode: {
      javascript: `function wordBreak(s, wordDict) {\n  // Your solution here\n}`,
      python: `def wordBreak(s, wordDict):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public boolean wordBreak(String s, List<String> wordDict) {\n        // Your solution here\n        return false;\n    }\n}`,
      "c++": `#include <string>\n#include <vector>\nusing namespace std;\n\nbool wordBreak(string s, vector<string>& wordDict) {\n    // Your solution here\n    return false;\n}`,
    },
  },
  {
    id: "challenge-8", title: "Container With Most Water", difficulty: "Medium", acceptance: 51,
    tags: ["Array", "Two Pointer"], submissions: "2.9M", xpReward: 20,
    description: "You are given an integer array height. Find two lines that together with the x-axis form a container that holds the most water.",
    constraints: "2 ≤ n ≤ 10⁵\n0 ≤ height[i] ≤ 10⁴",
    sampleTestCases: [
      { input: "height = [1,8,6,2,5,4,8,3,7]", output: "49" },
      { input: "height = [1,1]", output: "1" },
    ],
    starterCode: {
      javascript: `function maxArea(height) {\n  // Your solution here\n}`,
      python: `def maxArea(height):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int maxArea(int[] height) {\n        // Your solution here\n        return 0;\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nint maxArea(vector<int>& height) {\n    // Your solution here\n    return 0;\n}`,
    },
  },
  {
    id: "challenge-13", title: "3Sum", difficulty: "Medium", acceptance: 35,
    tags: ["Array", "Two Pointer", "Sorting"], submissions: "4.5M", xpReward: 20,
    description: "Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that they sum to 0. No duplicate triplets.",
    constraints: "3 ≤ nums.length ≤ 3000\n-10⁵ ≤ nums[i] ≤ 10⁵",
    sampleTestCases: [
      { input: "nums = [-1,0,1,2,-1,-4]", output: "[[-1,-1,2],[-1,0,1]]" },
      { input: "nums = [0,1,1]", output: "[]" },
      { input: "nums = [0,0,0]", output: "[[0,0,0]]" },
    ],
    starterCode: {
      javascript: `function threeSum(nums) {\n  // Your solution here\n}`,
      python: `def threeSum(nums):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<Integer>> threeSum(int[] nums) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      "c++": `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<int>> threeSum(vector<int>& nums) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  {
    id: "challenge-14", title: "Group Anagrams", difficulty: "Medium", acceptance: 55,
    tags: ["Hash Table", "String", "Sorting"], submissions: "3.4M", xpReward: 20,
    description: "Given an array of strings strs, group the anagrams together. You can return the answer in any order.",
    constraints: "1 ≤ strs.length ≤ 10⁴\n0 ≤ strs[i].length ≤ 100",
    sampleTestCases: [
      { input: 'strs = ["eat","tea","tan","ate","nat","bat"]', output: '[["bat"],["nat","tan"],["ate","eat","tea"]]' },
      { input: 'strs = [""]', output: '[[""]]' },
    ],
    starterCode: {
      javascript: `function groupAnagrams(strs) {\n  // Your solution here\n}`,
      python: `def groupAnagrams(strs):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<String>> groupAnagrams(String[] strs) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      "c++": `#include <vector>\n#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<string>> groupAnagrams(vector<string>& strs) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  {
    id: "challenge-15", title: "Coin Change", difficulty: "Medium", acceptance: 40,
    tags: ["Dynamic Programming", "BFS"], submissions: "2.2M", xpReward: 20,
    description: "You are given coins of different denominations and a total amount. Return the fewest number of coins needed to make up that amount. If it cannot be made up, return -1.",
    constraints: "1 ≤ coins.length ≤ 12\n0 ≤ amount ≤ 10⁴",
    sampleTestCases: [
      { input: "coins = [1,5,10], amount = 12", output: "3", explanation: "12 = 10 + 1 + 1" },
      { input: "coins = [2], amount = 3", output: "-1" },
      { input: "coins = [1], amount = 0", output: "0" },
    ],
    starterCode: {
      javascript: `function coinChange(coins, amount) {\n  // Your solution here\n}`,
      python: `def coinChange(coins, amount):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int coinChange(int[] coins, int amount) {\n        // Your solution here\n        return -1;\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nint coinChange(vector<int>& coins, int amount) {\n    // Your solution here\n    return -1;\n}`,
    },
  },
  // ─── Hard ─────────────────────────────────────────────────────────────────────
  {
    id: "challenge-3", title: "Merge K Sorted Lists", difficulty: "Hard", acceptance: 18,
    tags: ["Linked List", "Divide and Conquer", "Heap (Priority Queue)"], submissions: "850K", xpReward: 30,
    description: "You are given an array of k linked-lists, each sorted in ascending order. Merge all into one sorted linked-list and return it.",
    constraints: "0 ≤ k ≤ 10⁴\n-10⁴ ≤ lists[i][j] ≤ 10⁴",
    sampleTestCases: [
      { input: "lists = [[1,4,5],[1,3,4],[2,6]]", output: "[1,1,2,3,4,4,5,6]" },
      { input: "lists = []", output: "[]" },
    ],
    starterCode: {
      javascript: `function mergeKLists(lists) {\n  // Your solution here\n}`,
      python: `def mergeKLists(lists):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public ListNode mergeKLists(ListNode[] lists) {\n        // Your solution here\n        return null;\n    }\n}`,
      "c++": `#include <vector>\n#include <queue>\nusing namespace std;\n\nListNode* mergeKLists(vector<ListNode*>& lists) {\n    // Your solution here\n    return nullptr;\n}`,
    },
  },
  {
    id: "challenge-7", title: "N-Queens", difficulty: "Hard", acceptance: 12,
    tags: ["Backtracking"], submissions: "420K", xpReward: 30,
    description: "Place n queens on an n × n chessboard such that no two queens attack each other. Return all distinct solutions.",
    constraints: "1 ≤ n ≤ 9",
    sampleTestCases: [
      { input: "n = 4", output: '[[".Q..","...Q","Q...","..Q."],["..Q.","Q...","...Q",".Q.."]]' },
      { input: "n = 1", output: '[["Q"]]' },
    ],
    starterCode: {
      javascript: `function solveNQueens(n) {\n  // Your solution here\n}`,
      python: `def solveNQueens(n):\n    # Your solution here\n    pass`,
      java: `import java.util.*;\n\nclass Solution {\n    public List<List<String>> solveNQueens(int n) {\n        // Your solution here\n        return new ArrayList<>();\n    }\n}`,
      "c++": `#include <vector>\n#include <string>\nusing namespace std;\n\nvector<vector<string>> solveNQueens(int n) {\n    // Your solution here\n    return {};\n}`,
    },
  },
  {
    id: "challenge-16", title: "Trapping Rain Water", difficulty: "Hard", acceptance: 22,
    tags: ["Array", "Two Pointer", "Stack", "Dynamic Programming"], submissions: "1.5M", xpReward: 30,
    description: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.",
    constraints: "1 ≤ n ≤ 2 × 10⁴\n0 ≤ height[i] ≤ 10⁵",
    sampleTestCases: [
      { input: "height = [0,1,0,2,1,0,1,3,2,1,2,1]", output: "6" },
      { input: "height = [4,2,0,3,2,5]", output: "9" },
    ],
    starterCode: {
      javascript: `function trap(height) {\n  // Your solution here\n}`,
      python: `def trap(height):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int trap(int[] height) {\n        // Your solution here\n        return 0;\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\nint trap(vector<int>& height) {\n    // Your solution here\n    return 0;\n}`,
    },
  },
  {
    id: "challenge-17", title: "Median of Two Sorted Arrays", difficulty: "Hard", acceptance: 15,
    tags: ["Array", "Binary Search", "Divide and Conquer"], submissions: "1.1M", xpReward: 30,
    description: "Given two sorted arrays nums1 and nums2, return the median of the two sorted arrays. Overall runtime complexity should be O(log(m+n)).",
    constraints: "0 ≤ m,n ≤ 1000\n1 ≤ m + n ≤ 2000",
    sampleTestCases: [
      { input: "nums1 = [1,3], nums2 = [2]", output: "2.0" },
      { input: "nums1 = [1,2], nums2 = [3,4]", output: "2.5" },
    ],
    starterCode: {
      javascript: `function findMedianSortedArrays(nums1, nums2) {\n  // Your solution here\n}`,
      python: `def findMedianSortedArrays(nums1, nums2):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public double findMedianSortedArrays(int[] nums1, int[] nums2) {\n        // Your solution here\n        return 0.0;\n    }\n}`,
      "c++": `#include <vector>\nusing namespace std;\n\ndouble findMedianSortedArrays(vector<int>& nums1, vector<int>& nums2) {\n    // Your solution here\n    return 0.0;\n}`,
    },
  },
  {
    id: "challenge-18", title: "Longest Valid Parentheses", difficulty: "Hard", acceptance: 20,
    tags: ["String", "Stack", "Dynamic Programming"], submissions: "680K", xpReward: 30,
    description: "Given a string containing just '(' and ')', return the length of the longest valid (well-formed) parentheses substring.",
    constraints: "0 ≤ s.length ≤ 3 × 10⁴",
    sampleTestCases: [
      { input: 's = "(()"', output: "2" },
      { input: 's = ")()())"', output: "4" },
      { input: 's = ""', output: "0" },
    ],
    starterCode: {
      javascript: `function longestValidParentheses(s) {\n  // Your solution here\n}`,
      python: `def longestValidParentheses(s):\n    # Your solution here\n    pass`,
      java: `class Solution {\n    public int longestValidParentheses(String s) {\n        // Your solution here\n        return 0;\n    }\n}`,
      "c++": `#include <string>\n#include <stack>\nusing namespace std;\n\nint longestValidParentheses(string s) {\n    // Your solution here\n    return 0;\n}`,
    },
  },
];
