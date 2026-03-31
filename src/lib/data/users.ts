import type { User, Teammate } from "@/types";

export const USERS: User[] = [
  { id: "user-1", name: "Arjun Mehta", college: "IIT Delhi", skills: ["React", "Node.js", "Python"], score: 2840, solved: 342, streak: 47, avatar: "AM", color: "#6C3BFF" },
  { id: "user-2", name: "Priya Sharma", college: "NIT Trichy", skills: ["ML", "Python", "TensorFlow"], score: 2650, solved: 289, streak: 33, avatar: "PS", color: "#10B981" },
  { id: "user-3", name: "Rohit Kumar", college: "BITS Pilani", skills: ["C++", "DSA", "Rust"], score: 2510, solved: 418, streak: 21, avatar: "RK", color: "#F59E0B" },
  { id: "user-4", name: "Anika Singh", college: "VIT Vellore", skills: ["UI/UX", "Figma", "React"], score: 2380, solved: 197, streak: 15, avatar: "AS", color: "#EF4444" },
  { id: "user-5", name: "Dev Patel", college: "IIIT Hyderabad", skills: ["Go", "Docker", "K8s"], score: 2210, solved: 231, streak: 62, avatar: "DP", color: "#8B5CF6" },
];

export const TEAMMATES: Teammate[] = [
  { id: "teammate-1", name: "Kavya Reddy", college: "IIT Madras", skills: ["Flutter", "Firebase", "UI/UX"], match: 94, hackathons: 8, rating: 4.9, looking: "Team Member", avatar: "KR", color: "#10B981" },
  { id: "teammate-2", name: "Sai Kiran", college: "NIT Warangal", skills: ["Python", "ML", "FastAPI"], match: 87, hackathons: 12, rating: 4.7, looking: "Team Member", avatar: "SK", color: "#6C3BFF" },
  { id: "teammate-3", name: "Ishaan Roy", college: "Jadavpur Univ", skills: ["React", "TypeScript", "AWS"], match: 81, hackathons: 5, rating: 4.8, looking: "Has 2 Spots", avatar: "IR", color: "#F59E0B" },
  { id: "teammate-4", name: "Tanvi Joshi", college: "DAIICT", skills: ["Blockchain", "Solidity", "Web3"], match: 76, hackathons: 9, rating: 4.6, looking: "Has 1 Spot", avatar: "TJ", color: "#EF4444" },
];
