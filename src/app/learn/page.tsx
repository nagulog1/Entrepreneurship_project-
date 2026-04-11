'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import {
  getLearningPaths,
  getUserEnrollments,
  enrollInLearningPath,
} from '@/lib/firebase/firestore';
import ShimmerCard from '@/components/shared/ShimmerCard';
import AuthModal from '@/components/auth/AuthModal';
import type { LearningPath } from '@/types';

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_PATHS: LearningPath[] = [
  {
    id: 'lp1',
    title: 'DSA Fundamentals',
    description: 'Master the core data structures and algorithms every developer needs — arrays, linked lists, trees, graphs, and more.',
    difficulty: 'Beginner',
    estimatedTime: '4 weeks',
    challenges: ['ch1','ch2','ch3','ch4','ch5'],
    enrolledCount: 1240,
    completionRate: 68,
    tags: ['Arrays','Sorting','Searching','Trees'],
    createdAt: { toDate: () => new Date() } as unknown as LearningPath['createdAt'],
  },
  {
    id: 'lp2',
    title: 'Dynamic Programming Mastery',
    description: 'From memoisation to tabulation — solve classic DP problems and ace FAANG interviews.',
    difficulty: 'Advanced',
    estimatedTime: '6 weeks',
    challenges: ['ch6','ch7','ch8','ch9'],
    enrolledCount: 876,
    completionRate: 45,
    tags: ['DP','Recursion','Optimization'],
    createdAt: { toDate: () => new Date() } as unknown as LearningPath['createdAt'],
  },
  {
    id: 'lp3',
    title: 'Web Dev for Hackathons',
    description: 'Build full-stack projects fast — React, Node, Firebase. Everything you need to win hackathons.',
    difficulty: 'Intermediate',
    estimatedTime: '3 weeks',
    challenges: ['ch10','ch11','ch12'],
    enrolledCount: 2100,
    completionRate: 72,
    tags: ['React','Node','Firebase','CSS'],
    createdAt: { toDate: () => new Date() } as unknown as LearningPath['createdAt'],
  },
  {
    id: 'lp4',
    title: 'ML & AI Basics',
    description: 'Understand machine learning algorithms and build your first models with Python and scikit-learn.',
    difficulty: 'Intermediate',
    estimatedTime: '5 weeks',
    challenges: ['ch13','ch14','ch15','ch16'],
    enrolledCount: 654,
    completionRate: 38,
    tags: ['Python','ML','NumPy','Pandas'],
    createdAt: { toDate: () => new Date() } as unknown as LearningPath['createdAt'],
  },
];

const DIFF_COLORS: Record<string, { bg: string; color: string }> = {
  Beginner:     { bg: '#10B98122', color: '#10B981' },
  Intermediate: { bg: '#F59E0B22', color: '#F59E0B' },
  Advanced:     { bg: '#EF444422', color: '#EF4444' },
};

const TOPIC_ICONS: Record<string, string> = {
  Arrays: '📦', Trees: '🌳', DP: '🧩', Graphs: '🕸️',
  React: '⚛️', Python: '🐍', ML: '🤖', Firebase: '🔥',
  Node: '🟢', CSS: '🎨', Sorting: '🔢', Searching: '🔍',
};

// ─── Path Card ────────────────────────────────────────────────────────────────

interface Enrollment { pathId: string; progress: number; completedChallenges: string[] }

function PathCard({
  path,
  enrollment,
  onEnroll,
}: {
  path: LearningPath;
  enrollment?: Enrollment;
  onEnroll: (pathId: string) => void;
}) {
  const router = useRouter();
  const dc = DIFF_COLORS[path.difficulty] ?? DIFF_COLORS.Beginner;
  const isEnrolled = !!enrollment;
  const progress   = enrollment?.progress ?? 0;

  return (
    <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, color: '#F0F0FF', lineHeight: 1.3 }}>
          {path.title}
        </h3>
        <span className="tag" style={{ background: dc.bg, color: dc.color, flexShrink: 0 }}>
          {path.difficulty}
        </span>
      </div>

      <p style={{ color: '#8B8BAD', fontSize: 13, lineHeight: 1.6 }}>{path.description}</p>

      {/* Topic icons */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {path.tags?.map((tag) => (
          <span key={tag} className="tag" style={{ background: '#16213E', color: '#A0A0C0', fontSize: 12 }}>
            {TOPIC_ICONS[tag] || '📌'} {tag}
          </span>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#8B8BAD' }}>
        <span>⏱ {path.estimatedTime}</span>
        <span>📝 {path.challenges.length} challenges</span>
        <span>👥 {path.enrolledCount.toLocaleString()} enrolled</span>
      </div>

      {/* Progress bar (if enrolled) */}
      {isEnrolled && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8B8BAD', marginBottom: 6 }}>
            <span>Your progress</span>
            <span style={{ color: '#6C3BFF', fontWeight: 600 }}>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Completion rate */}
      {!isEnrolled && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8B8BAD', marginBottom: 6 }}>
            <span>Avg completion</span>
            <span>{path.completionRate}%</span>
          </div>
          <div className="progress-bar">
            <div style={{ height: '100%', borderRadius: 4, background: '#10B981', width: `${path.completionRate}%`, transition: 'width 0.6s' }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        {isEnrolled ? (
          <button
            className="btn-primary"
            style={{ flex: 1, fontSize: 13 }}
            onClick={() => router.push(`/learn/${path.id}`)}
          >
            {progress === 0 ? '▶ Start' : progress === 100 ? '✓ Review' : '▶ Continue'}
          </button>
        ) : (
          <>
            <button
              className="btn-ghost"
              style={{ flex: 1, fontSize: 13 }}
              onClick={() => router.push(`/learn/${path.id}`)}
            >
              Preview
            </button>
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 13 }}
              onClick={() => onEnroll(path.id)}
            >
              Enroll Free
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const { isAuthenticated, user } = useAuthContext();
  const { showNotif } = useAppStore();

  const [paths, setPaths]             = useState<LearningPath[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAuth, setShowAuth]       = useState(false);
  const [search, setSearch]           = useState('');
  const [diffFilter, setDiff]         = useState('All');

  useEffect(() => {
    getLearningPaths()
      .then((data) => setPaths(data.length ? data : MOCK_PATHS))
      .catch(() => setPaths(MOCK_PATHS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) { setEnrollments([]); return; }
    getUserEnrollments(user.uid)
      .then((data) => setEnrollments(data as Enrollment[]))
      .catch(() => setEnrollments([]));
  }, [user]);

  const handleEnroll = async (pathId: string) => {
    if (!isAuthenticated || !user) { setShowAuth(true); return; }
    try {
      await enrollInLearningPath(pathId, user.uid);
      setEnrollments((prev) => [...prev, { pathId, progress: 0, completedChallenges: [] }]);
      showNotif('Enrolled successfully! 🎉', 'success');
    } catch {
      showNotif('Failed to enroll. Please try again.', 'error');
    }
  };

  const myEnrolledIds = new Set(enrollments.map((e) => e.pathId));
  const myPaths  = paths.filter((p) => myEnrolledIds.has(p.id));
  const allPaths = paths.filter((p) =>
    (diffFilter === 'All' || p.difficulty === diffFilter) &&
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          📚 Learning Paths
        </h1>
        <p style={{ color: '#8B8BAD' }}>Structured courses to master skills and ace coding interviews</p>
      </div>

      {/* My Learning (if enrolled in any) */}
      {myPaths.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
            📖 My Learning
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
            {myPaths.map((p) => (
              <PathCard
                key={p.id}
                path={p}
                enrollment={enrollments.find((e) => e.pathId === p.id)}
                onEnroll={handleEnroll}
              />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="input"
          placeholder="🔍 Search paths..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Beginner', 'Intermediate', 'Advanced'].map((d) => (
            <button
              key={d}
              className="tab-btn"
              onClick={() => setDiff(d)}
              style={{
                background: diffFilter === d ? '#6C3BFF33' : '#1E1E35',
                color:      diffFilter === d ? '#8B5CF6'   : '#8B8BAD',
                border:     `1px solid ${diffFilter === d ? '#6C3BFF44' : '#2D2D50'}`,
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* All Paths Grid */}
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
        🗺️ All Paths
      </h2>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => <ShimmerCard key={i} height={320} />)}
        </div>
      ) : allPaths.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5A80' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📚</div>
          <p style={{ fontSize: 16, color: '#8B8BAD' }}>No paths match your search.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 16 }}>
          {allPaths.map((p) => (
            <PathCard
              key={p.id}
              path={p}
              enrollment={enrollments.find((e) => e.pathId === p.id)}
              onEnroll={handleEnroll}
            />
          ))}
        </div>
      )}
    </div>
  );
}
