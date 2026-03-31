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
