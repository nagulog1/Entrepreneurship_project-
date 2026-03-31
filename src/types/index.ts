export interface Event {
  id: string;
  title: string;
  org: string;
  banner: string;
  date: string;
  deadline: string;
  mode: "Online" | "Offline" | "Hybrid";
  city: string;
  prize: string;
  difficulty: "Easy" | "Intermediate" | "Advanced";
  teamSize: string;
  category: string;
  tags: string[];
  registered: number;
  featured: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  acceptance: number;
  tags: string[];
  solved: boolean;
  submissions: string;
}

export interface User {
  id: string;
  name: string;
  college: string;
  skills: string[];
  score: number;
  solved: number;
  streak: number;
  avatar: string;
  color: string;
}

export interface Teammate {
  id: string;
  name: string;
  college: string;
  skills: string[];
  match: number;
  hackathons: number;
  rating: number;
  looking: string;
  avatar: string;
  color: string;
}

export interface TestCase {
  input: string;
  expected: string;
  got: string;
  pass: boolean;
}

export interface RunResult {
  status: "accepted" | "wrong_answer" | "time_limit";
  runtime: string;
  memory: string;
  cases: TestCase[];
}

export interface Notification {
  msg: string;
  type: "success" | "error";
}
