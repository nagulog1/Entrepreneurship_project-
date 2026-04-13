'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getContestById,
  getContestLeaderboard,
  subscribeToContestLeaderboard,
} from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import CountdownTimer from '@/components/shared/CountdownTimer';
import AuthModal from '@/components/auth/AuthModal';
import ShimmerCard from '@/components/shared/ShimmerCard';
import type { Contest, ContestLeaderboardEntry } from '@/types';

// ── Mock fallback data so page renders without Firebase ───────────────────────

const MOCK_CONTESTS: Record<string, Contest> = {
  c1: {
    id: 'c1',
    title: 'Weekly Challenge #42',
    description: 'Three algorithmic problems of increasing difficulty. Compete in 90 minutes.',
    startTime: { toDate: () => new Date(Date.now() + 2 * 86400000) } as unknown as Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() + 2 * 86400000 + 5400000) } as unknown as Contest['endTime'],
    duration: 90,
    challenges: ['ch1', 'ch2', 'ch3'],
    participants: 0,
    status: 'upcoming',
    prizes: [
      { position: 1, amount: 5000, description: '1st Place' },
      { position: 2, amount: 3000, description: '2nd Place' },
      { position: 3, amount: 1000, description: '3rd Place' },
    ],
    createdAt: { toDate: () => new Date() } as unknown as Contest['createdAt'],
  },
  c2: {
    id: 'c2',
    title: 'Data Structures Sprint',
    description: 'Master arrays, trees, and graphs in 60 minutes of intense problem solving.',
    startTime: { toDate: () => new Date(Date.now() - 1800000) } as unknown as Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() + 1800000) } as unknown as Contest['endTime'],
    duration: 60,
    challenges: ['ch4', 'ch5'],
    participants: 128,
    status: 'live',
    prizes: [{ position: 1, amount: 2000, description: '1st Place' }],
    createdAt: { toDate: () => new Date() } as unknown as Contest['createdAt'],
  },
  c3: {
    id: 'c3',
    title: 'DP Marathon',
    description: 'Dynamic programming contest featuring 5 classic DP problems.',
    startTime: { toDate: () => new Date(Date.now() - 86400000 * 3) } as unknown as Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() - 86400000 * 3 + 7200000) } as unknown as Contest['endTime'],
    duration: 120,
    challenges: ['ch6', 'ch7', 'ch8', 'ch9', 'ch10'],
    participants: 342,
    status: 'ended',
    prizes: [{ position: 1, amount: 10000, description: '1st Place' }],
    createdAt: { toDate: () => new Date() } as unknown as Contest['createdAt'],
  },
};

function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as string | number);
}

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const { showNotif } = useAppStore();

  const [contest, setContest] = useState<Contest | null>(null);
  const [leaderboard, setLeaderboard] = useState<ContestLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!id) return;

    let unsubscribe = () => {};
    let mounted = true;

    // Try Firestore first, fall back to mock data
    Promise.all([
      getContestById(id).catch(() => null),
      getContestLeaderboard(id).catch(() => []),
    ])
      .then(([contestDoc, board]) => {
        if (!mounted) return;
        // Use Firestore data if available, otherwise check mock data
        const resolved = contestDoc ?? MOCK_CONTESTS[id] ?? null;
        setContest(resolved);
        setLeaderboard(board ?? []);
      })
      .catch(() => {
        if (mounted) setContest(MOCK_CONTESTS[id] ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // Subscribe to live leaderboard updates
    try {
      unsubscribe = subscribeToContestLeaderboard(id, (entries) => {
        if (mounted) setLeaderboard(entries);
      });
    } catch {
      // Firebase not configured — no live updates
    }

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [id]);

  const totalPrize = useMemo(
    () => contest?.prizes?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    [contest?.prizes]
  );

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <ShimmerCard height={140} />
        <ShimmerCard height={200} />
        <ShimmerCard height={260} />
      </div>
    );
  }

  if (!contest) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#5A5A80' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: '#8B8BAD' }}>Contest not found</div>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push('/contests')}>
          ← Back to Contests
        </button>
      </div>
    );
  }

  const startsAt = toDate(contest.startTime);
  const endsAt   = toDate(contest.endTime);

  const handleJoin = () => {
    if (!isAuthenticated) { setShowAuth(true); return; }
    showNotif(contest.status === 'live' ? 'Joining contest...' : 'Registered successfully!', 'success');
  };

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/contests')}>
        ← Back to Contests
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* ── Left column ── */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="badge" style={{ background: '#6C3BFF22', color: '#8B5CF6' }}>
                {contest.status.toUpperCase()}
              </span>
              <span style={{ color: '#8B8BAD', fontSize: 13 }}>
                {contest.duration} min · {contest.challenges.length} problems
              </span>
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              {contest.title}
            </h1>
            <p style={{ color: '#8B8BAD', lineHeight: 1.6 }}>{contest.description}</p>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Total Prize</div>
                <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 22 }}>
                  ₹{totalPrize.toLocaleString()}
                </div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Participants</div>
                <div style={{ fontWeight: 700, color: '#10B981', fontSize: 22 }}>
                  {contest.participants}
                </div>
              </div>
            </div>
          </div>

          {/* Problem set */}
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 12 }}>
              🏁 Problem Set
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contest.challenges.map((cId, idx) => (
                <div
                  key={cId}
                  style={{ background: '#16213E', borderRadius: 10, padding: 12, cursor: 'pointer' }}
                  onClick={() => router.push(`/challenges/${cId}`)}
                >
                  <span style={{ color: '#8B8BAD', marginRight: 8 }}>#{idx + 1}</span>
                  <span style={{ color: '#E0E0FF' }}>{cId}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 12 }}>
              🏆 Live Leaderboard
            </h3>
            {leaderboard.length === 0 ? (
              <div style={{ color: '#8B8BAD' }}>
                Leaderboard will appear once submissions start.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.map((entry, idx) => (
                  <div
                    key={entry.userId}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#16213E', borderRadius: 10, padding: '10px 12px' }}
                  >
                    <div style={{ width: 26, textAlign: 'center', color: '#8B8BAD' }}>{idx + 1}</div>
                    <div className="avatar">{(entry.userName || 'U').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{entry.userName || entry.userId}</div>
                      <div style={{ fontSize: 12, color: '#8B8BAD' }}>
                        {entry.solved} solved · penalty {entry.penalty}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#6C3BFF' }}>{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ── */}
        <div>
          <div className="card" style={{ padding: 20, position: 'sticky', top: 80 }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#8B8BAD' }}>
              {contest.status === 'upcoming' ? 'Starts in'
                : contest.status === 'live' ? 'Ends in'
                : 'Contest finished'}
            </div>

            {contest.status !== 'ended' ? (
              <CountdownTimer targetDate={contest.status === 'upcoming' ? startsAt : endsAt} />
            ) : (
              <div style={{ color: '#5A5A80' }}>
                Ended on {endsAt.toLocaleDateString('en-IN')}
              </div>
            )}

            {/* Prize breakdown */}
            {contest.prizes.length > 0 && (
              <div style={{ marginTop: 16, borderTop: '1px solid #2D2D50', paddingTop: 16 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD', marginBottom: 8, fontWeight: 600 }}>
                  PRIZES
                </div>
                {contest.prizes.map((p) => (
                  <div key={p.position} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#8B8BAD' }}>#{p.position} {p.description}</span>
                    <span style={{ color: '#F59E0B', fontWeight: 600 }}>₹{p.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={handleJoin}
              disabled={contest.status === 'ended'}
            >
              {contest.status === 'live' ? '▶ Join Now'
                : contest.status === 'upcoming' ? 'Register'
                : 'Contest Ended'}
            </button>

            <button
              className="btn-ghost"
              style={{ width: '100%', marginTop: 8 }}
              onClick={() => router.push('/challenges')}
            >
              Practice Before Contest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}