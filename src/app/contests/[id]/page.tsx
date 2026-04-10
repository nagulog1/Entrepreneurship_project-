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
    let unsubscribe = () => {};
    let mounted = true;

    Promise.all([getContestById(id), getContestLeaderboard(id)])
      .then(([contestDoc, board]) => {
        if (!mounted) return;
        setContest(contestDoc);
        setLeaderboard(board);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    unsubscribe = subscribeToContestLeaderboard(id, (entries) => {
      setLeaderboard(entries);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [id]);

  const totalPrize = useMemo(
    () => contest?.prizes?.reduce((sum, prize) => sum + (prize.amount || 0), 0) || 0,
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
  const endsAt = toDate(contest.endTime);

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/contests')}>
        ← Back to Contests
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span className="badge" style={{ background: '#6C3BFF22', color: '#8B5CF6' }}>{contest.status.toUpperCase()}</span>
              <span style={{ color: '#8B8BAD', fontSize: 13 }}>{contest.duration} min · {contest.challenges.length} problems</span>
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              {contest.title}
            </h1>
            <p style={{ color: '#8B8BAD', lineHeight: 1.6 }}>{contest.description}</p>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Total Prize</div>
                <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 22 }}>₹{totalPrize.toLocaleString()}</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Participants</div>
                <div style={{ fontWeight: 700, color: '#10B981', fontSize: 22 }}>{contest.participants}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 12 }}>🏁 Problem Set</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contest.challenges.map((challengeId, idx) => (
                <div
                  key={challengeId}
                  style={{ background: '#16213E', borderRadius: 10, padding: 12, cursor: 'pointer' }}
                  onClick={() => router.push(`/challenges/${challengeId}`)}
                >
                  <span style={{ color: '#8B8BAD', marginRight: 8 }}>#{idx + 1}</span>
                  <span>{challengeId}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 12 }}>🏆 Live Leaderboard</h3>
            {leaderboard.length === 0 ? (
              <div style={{ color: '#8B8BAD' }}>Leaderboard will appear once submissions start.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leaderboard.map((entry, idx) => (
                  <div key={entry.userId} className="leaderboard-row" style={{ borderRadius: 10, background: '#16213E', padding: '10px 12px' }}>
                    <div style={{ width: 26, textAlign: 'center', color: '#8B8BAD' }}>{idx + 1}</div>
                    <div className="avatar">{(entry.userName || 'U').slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{entry.userName || entry.userId}</div>
                      <div style={{ fontSize: 12, color: '#8B8BAD' }}>{entry.solved} solved · penalty {entry.penalty}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#6C3BFF' }}>{entry.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20, position: 'sticky', top: 80 }}>
            <div style={{ marginBottom: 12, fontSize: 13, color: '#8B8BAD' }}>
              {contest.status === 'upcoming' ? 'Starts in' : contest.status === 'live' ? 'Ends in' : 'Contest finished'}
            </div>
            {contest.status !== 'ended' ? (
              <CountdownTimer targetDate={contest.status === 'upcoming' ? startsAt : endsAt} />
            ) : (
              <div style={{ color: '#5A5A80' }}>Ended on {endsAt.toLocaleDateString('en-IN')}</div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%', marginTop: 16 }}
              onClick={() => {
                if (!isAuthenticated) {
                  setShowAuth(true);
                  return;
                }
                showNotif(contest.status === 'live' ? 'Joining contest...' : 'Registered successfully!', 'success');
              }}
            >
              {contest.status === 'live' ? '▶ Join Now' : 'Register'}
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
