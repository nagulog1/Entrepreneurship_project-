type Difficulty = "Easy" | "Medium" | "Hard" | "Intermediate" | "Advanced";

export const difficultyColor = (d: Difficulty | string): string => {
  if (d === "Easy") return "#10B981";
  if (d === "Medium" || d === "Intermediate") return "#F59E0B";
  return "#EF4444"; // Hard / Advanced
};

export const difficultyBg = (d: Difficulty | string): string => {
  if (d === "Easy") return "#10B98122";
  if (d === "Medium" || d === "Intermediate") return "#F59E0B22";
  return "#EF444422";
};
