//src/app/contests/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import { getContests } from '@/lib/firebase/firestore';
import ShimmerCard from '@/components/shared/ShimmerCard';
import CountdownTimer from '@/components/shared/CountdownTimer';
import AuthModal from '@/components/auth/AuthModal';
import type { Contest } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as number);
}

const MOCK_CONTESTS: Contest[] = [
  {
    id: 'c1',
    title: 'Weekly Challenge #42',
    description: 'Three algorithmic problems of increasing difficulty. Compete in 90 minutes.',
    startTime: { toDate: () => new Date(Date.now() + 2 * 86400000) } as unknown as import('@/types').Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() + 2 * 86400000 + 5400000) } as unknown as import('@/types').Contest['endTime'],
    duration: 90,
    challenges: ['ch1', 'ch2', 'ch3'],
    participants: 0,
    status: 'upcoming',
    prizes: [
      { position: 1, amount: 5000, description: '1st Place' },
      { position: 2, amount: 3000, description: '2nd Place' },
      { position: 3, amount: 1000, description: '3rd Place' },
    ],
    createdAt: { toDate: () => new Date() } as unknown as import('@/types').Contest['createdAt'],
  },
  {
    id: 'c2',
    title: 'Data Structures Sprint',
    description: 'Master arrays, trees, and graphs in 60 minutes of intense problem solving.',
    startTime: { toDate: () => new Date(Date.now() - 1800000) } as unknown as import('@/types').Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() + 1800000) } as unknown as import('@/types').Contest['endTime'],
    duration: 60,
    challenges: ['ch4', 'ch5'],
    participants: 128,
    status: 'live',
    prizes: [{ position: 1, amount: 2000, description: '1st Place' }],
    createdAt: { toDate: () => new Date() } as unknown as import('@/types').Contest['createdAt'],
  },
  {
    id: 'c3',
    title: 'DP Marathon',
    description: 'Dynamic programming contest featuring 5 classic DP problems.',
    startTime: { toDate: () => new Date(Date.now() - 86400000 * 3) } as unknown as import('@/types').Contest['startTime'],
    endTime:   { toDate: () => new Date(Date.now() - 86400000 * 3 + 7200000) } as unknown as import('@/types').Contest['endTime'],
    duration: 120,
    challenges: ['ch6', 'ch7', 'ch8', 'ch9', 'ch10'],
    participants: 342,
    status: 'ended',
    prizes: [{ position: 1, amount: 10000, description: '1st Place' }],
    createdAt: { toDate: () => new Date() } as unknown as import('@/types').Contest['createdAt'],
  },
];

// ─── Contest Card ─────────────────────────────────────────────────────────────

function ContestCard({ contest }: { contest: Contest }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthContext();
  const { showNotif } = useAppStore();
  const [showAuth, setShowAuth] = useState(false);

  const start = toDate(contest.startTime);
  const end   = toDate(contest.endTime);

  const statusColors: Record<string, { bg: string; color: string }> = {
    upcoming: { bg: '#F59E0B22', color: '#F59E0B' },
    live:     { bg: '#EF444422', color: '#EF4444' },
    ended:    { bg: '#5A5A8022', color: '#5A5A80' },
  };
  const sc = statusColors[contest.status] ?? statusColors.ended;

  const totalPrize = contest.prizes.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}
      <div
        className="card"
        style={{ padding: 24, position: 'relative', overflow: 'hidden' }}
      >
        {/* Status badge */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span
            className="badge"
            style={{ background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}
          >
            {contest.status === 'live' && (
              <span
                style={{
                  display: 'inline-block', width: 7, height: 7,
                  background: '#EF4444', borderRadius: '50%', marginRight: 6,
                  animation: 'pulse 1.2s infinite',
                }}
              />
            )}
            {contest.status.toUpperCase()}
          </span>
          <span style={{ fontSize: 12, color: '#5A5A80' }}>
            {contest.duration} min · {contest.challenges.length} problems
          </span>
        </div>

        <h3
          style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#F0F0FF' }}
        >
          {contest.title}
        </h3>
        <p style={{ color: '#8B8BAD', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {contest.description}
        </p>

        {/* Prize + participants */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ background: '#16213E', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#F59E0B' }}>
              ₹{totalPrize.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: '#5A5A80' }}>Prize Pool</div>
          </div>
          <div style={{ background: '#16213E', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#10B981' }}>
              {contest.participants}
            </div>
            <div style={{ fontSize: 11, color: '#5A5A80' }}>Participants</div>
          </div>
        </div>

        {/* Countdown or time info */}
        <div style={{ marginBottom: 16 }}>
          {contest.status === 'upcoming' && (
            <div>
              <p style={{ fontSize: 12, color: '#8B8BAD', marginBottom: 8 }}>Starts in:</p>
              <CountdownTimer targetDate={start} compact />
            </div>
          )}
          {contest.status === 'live' && (
            <div>
              <p style={{ fontSize: 12, color: '#EF4444', marginBottom: 8 }}>Ends in:</p>
              <CountdownTimer targetDate={end} compact />
            </div>
          )}
          {contest.status === 'ended' && (
            <p style={{ fontSize: 13, color: '#5A5A80' }}>
              Ended {end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn-ghost"
            style={{ flex: 1, fontSize: 13 }}
            onClick={() => router.push(`/contests/${contest.id}`)}
          >
            View Details
          </button>
          {contest.status !== 'ended' && (
            <button
              className="btn-primary"
              style={{ flex: 1, fontSize: 13 }}
              onClick={() => {
                if (!isAuthenticated) { setShowAuth(true); return; }
                showNotif(`Registered for ${contest.title}! 🎉`, 'success');
              }}
            >
              {contest.status === 'live' ? '▶ Join Now' : 'Register'}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContestsPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'upcoming' | 'live' | 'ended'>('upcoming');

  useEffect(() => {
    getContests()
      .then((data) => setContests(data.length ? data : MOCK_CONTESTS))
      .catch(() => setContests(MOCK_CONTESTS))
      .finally(() => setLoading(false));
  }, []);

  const filtered = contests.filter((c) => c.status === tab);

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
          🏆 Contests
        </h1>
        <p style={{ color: '#8B8BAD' }}>Compete in timed coding contests and climb the leaderboard</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['upcoming', 'live', 'ended'] as const).map((t) => {
          const count = contests.filter((c) => c.status === t).length;
          return (
            <button
              key={t}
              className="tab-btn"
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? '#6C3BFF33' : '#1E1E35',
                color:      tab === t ? '#8B5CF6'   : '#8B8BAD',
                border:     `1px solid ${tab === t ? '#6C3BFF44' : '#2D2D50'}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}
            >
              {t === 'live' && (
                <span style={{ width: 7, height: 7, background: '#EF4444', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.2s infinite' }} />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {count > 0 && (
                <span style={{ background: tab === t ? '#6C3BFF' : '#2D2D50', color: tab === t ? '#fff' : '#8B8BAD', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {[1, 2, 3].map((i) => <ShimmerCard key={i} height={280} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5A80' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 18, color: '#8B8BAD' }}>No {tab} contests</div>
          <p style={{ fontSize: 14, marginTop: 8 }}>Check back soon for new contests!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {filtered.map((c) => <ContestCard key={c.id} contest={c} />)}
        </div>
      )}
    </div>
  );
}
