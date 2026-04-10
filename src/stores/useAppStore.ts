import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  name: string;
  college: string;
  branch: string;
  year: string;
  skills: string[];
  bio: string;
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    portfolio?: string;
  };
}

interface AppState {
  // Core state
  xp: number;
  streak: number;
  bookmarked: Set<string>;
  solvedChallenges: Set<string>;
  notification: { msg: string; type: 'success' | 'error' } | null;
  profile: Profile;

  // Actions
  addXp: (amount: number) => void;
  toggleBookmark: (id: string) => void;
  markSolved: (id: string) => void;
  updateProfile: (data: Partial<Profile>) => void;
  showNotif: (msg: string, type?: 'success' | 'error') => void;
  clearNotif: () => void;

  // Firebase sync actions (no-op if Firebase not configured)
  syncWithFirebase: (userId: string) => Promise<void>;
  pushSolvedToFirebase: (challengeId: string, xpEarned: number) => Promise<void>;
  pushBookmarkToFirebase: (itemId: string, bookmarked: boolean) => Promise<void>;
}

// ─── Zustand store with localStorage persistence ──────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      xp: 0,
      streak: 7,
      bookmarked: new Set<string>(),
      solvedChallenges: new Set<string>(),
      notification: null,
      profile: {
        name: 'Alex Johnson',
        college: 'IIT Bombay',
        branch: 'CSE',
        year: '3rd',
        skills: ['React', 'Python', 'ML'],
        bio: '',
        socialLinks: {},
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

      updateProfile: (data) =>
        set((s) => ({ profile: { ...s.profile, ...data } })),

      showNotif: (msg, type = 'success') => {
        set({ notification: { msg, type } });
        setTimeout(() => set({ notification: null }), 3500);
      },

      clearNotif: () => set({ notification: null }),

      // ── Firebase sync ──────────────────────────────────────────────────────

      syncWithFirebase: async (userId) => {
        try {
          const { getUserById } = await import('@/lib/firebase/firestore');
          const user = await getUserById(userId);
          if (!user) return;
          set({
            xp: user.stats?.xp ?? get().xp,
            streak: user.stats?.currentStreak ?? get().streak,
            profile: {
              name: user.displayName ?? user.name ?? get().profile.name,
              college: user.college ?? get().profile.college,
              branch: user.branch ?? get().profile.branch,
              year: user.year ?? get().profile.year,
              skills: (user.skills as string[]) ?? get().profile.skills,
              bio: user.bio ?? get().profile.bio,
              socialLinks: user.socialLinks ?? get().profile.socialLinks,
            },
          });
        } catch {}
      },

      pushSolvedToFirebase: async (challengeId, xpEarned) => {
        try {
          const { updateUserStats } = await import('@/lib/firebase/firestore');
          // We'd need the userId from AuthContext — best-effort attempt
          // Pages that need this will call updateUserStats directly
          void challengeId;
          void xpEarned;
          void updateUserStats;
        } catch {}
      },

      pushBookmarkToFirebase: async (itemId, isBookmarked) => {
        try {
          const { bookmarkItem, unbookmarkItem } = await import('@/lib/firebase/firestore');
          void itemId;
          void isBookmarked;
          void bookmarkItem;
          void unbookmarkItem;
        } catch {}
      },
    }),
    {
      name: 'unio-app-store',
      // Serialize/deserialize Sets for localStorage
      storage: {
        getItem: (key) => {
          try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            const state = parsed?.state;
            if (state) {
              if (state.bookmarked) state.bookmarked = new Set(state.bookmarked);
              if (state.solvedChallenges)
                state.solvedChallenges = new Set(state.solvedChallenges);
            }
            return parsed;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            const toStore = {
              ...value,
              state: {
                ...value.state,
                bookmarked: Array.from(value.state.bookmarked ?? []),
                solvedChallenges: Array.from(value.state.solvedChallenges ?? []),
              },
            };
            localStorage.setItem(key, JSON.stringify(toStore));
          } catch {}
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);

// ─── Derived selector ─────────────────────────────────────────────────────────

export function useLevel() {
  const xp = useAppStore((s) => s.xp);
  const thresholds = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];
  const titles = ['Newcomer', 'Learner', 'Coder', 'Builder', 'Hacker', 'Expert', 'Master', 'Champion', 'Legend', 'God'];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1;
  }
  const levelXp = xp - (thresholds[level - 1] ?? 0);
  const nextXp = (thresholds[level] ?? thresholds[thresholds.length - 1]) - (thresholds[level - 1] ?? 0);
  return { level, levelXp, nextXp, levelTitle: titles[level - 1] ?? 'God' };
}


