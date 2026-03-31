"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Notification } from "@/types";

interface AppState {
  xp: number;
  streak: number;
  bookmarked: Set<string>;
  solvedChallenges: Set<string>;
  notification: Notification | null;
  
  // Profile data
  profile: {
    name: string;
    college: string;
    branch: string;
    year: string;
    bio: string;
    skills: string[];
  };

  // Actions
  addXp: (amount: number) => void;
  toggleBookmark: (id: string) => void;
  markSolved: (id: string) => void;
  updateProfile: (data: AppState["profile"]) => void;
  showNotif: (msg: string, type?: "success" | "error") => void;
  clearNotif: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 1240,
      streak: 7,
      bookmarked: new Set(["event-1", "event-3"]),
      solvedChallenges: new Set(["challenge-1", "challenge-4", "challenge-5", "challenge-8"]),
      notification: null,
      
      profile: {
        name: "Your Name",
        college: "Your College, Chennai",
        branch: "CSE",
        year: "3rd",
        bio: "Passionate about coding and problem solving",
        skills: ["React", "Python", "DSA", "Node.js", "ML"],
      },

      addXp: (amount) => set((s) => ({ xp: s.xp + amount })),

      toggleBookmark: (id) =>
        set((s) => {
          const next = new Set(s.bookmarked);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return { bookmarked: next };
        }),

      markSolved: (id) =>
        set((s) => {
          const next = new Set(s.solvedChallenges);
          next.add(id);
          return { solvedChallenges: next };
        }),

      updateProfile: (data) => set({ profile: data }),

      showNotif: (msg, type = "success") => {
        set({ notification: { msg, type } });
        setTimeout(() => get().clearNotif(), 3000);
      },

      clearNotif: () => set({ notification: null }),
    }),
    {
      name: "uni-o-storage",
      // Sets are not serializable by default — handle manually
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key);
          if (!raw) return null;
          const parsed = JSON.parse(raw);
          return {
            ...parsed,
            state: {
              ...parsed.state,
              bookmarked: new Set(parsed.state.bookmarked ?? []),
              solvedChallenges: new Set(parsed.state.solvedChallenges ?? []),
            },
          };
        },
        setItem: (key, value) => {
          const serialized = {
            ...value,
            state: {
              ...value.state,
              bookmarked: Array.from(value.state.bookmarked),
              solvedChallenges: Array.from(value.state.solvedChallenges),
            },
          };
          localStorage.setItem(key, JSON.stringify(serialized));
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);

// Derived selectors
export const useLevel = () => {
  const xp = useAppStore((s) => s.xp);
  const level = Math.floor(xp / 300) + 1;
  const levelXp = xp % 300;
  const levelTitle =
    level <= 5 ? "Newcomer" : level <= 15 ? "Coder" : level <= 30 ? "Hacker" : "Expert";
  return { level, levelXp, levelTitle };
};
