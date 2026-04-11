export const COLORS = {
  primary: "#6C3BFF",
  primaryLight: "#8B5CF6",
  secondary: "#F59E0B",
  accent: "#10B981",
  danger: "#EF4444",
  surface: "#0F0F1A",
  surfaceLight: "#1A1A2E",
  surfaceMid: "#16213E",
  card: "#1E1E35",
  cardBorder: "#2D2D50",
  text: "#F0F0FF",
  textMuted: "#8B8BAD",
  textDim: "#5A5A80",
} as const;

export const SAMPLE_CODE = `function twoSum(nums, target) {
  // Your solution here
  const map = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map[complement] !== undefined) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`;

export const SAMPLE_CODE_BY_LANGUAGE: Record<string, string> = {
  JavaScript: SAMPLE_CODE,
  TypeScript: `function twoSum(nums: number[], target: number): number[] {
  // Your solution here
  const map: Record<number, number> = {};
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map[complement] !== undefined) {
      return [map[complement], i];
    }
    map[nums[i]] = i;
  }
  return [];
}`,
  Python: `def twoSum(nums, target):
    # Your solution here
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`,
  Java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your solution here
        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[] {};
    }
}`,
  'C++': `#include <vector>
#include <unordered_map>
using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}`,
};
