'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  enrollInLearningPath,
  getLearningPathById,
  getUserEnrollments,
  updateLearningProgress,
} from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import AuthModal from '@/components/auth/AuthModal';
import ShimmerCard from '@/components/shared/ShimmerCard';
import type { LearningPath } from '@/types';

interface EnrollmentData {
  pathId: string;
  progress: number;
  completedChallenges: string[];
}

const DIFF_COLORS: Record<string, { bg: string; color: string }> = {
  Beginner: { bg: '#10B98122', color: '#10B981' },
  Intermediate: { bg: '#F59E0B22', color: '#F59E0B' },
  Advanced: { bg: '#EF444422', color: '#EF4444' },
};

export default function LearningPathDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthContext();
  const { showNotif } = useAppStore();

  const [path, setPath] = useState<LearningPath | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const pathDoc = await getLearningPathById(id);
      if (!mounted) return;
      setPath(pathDoc);

      if (user) {
        const enrollments = (await getUserEnrollments(user.uid)) as EnrollmentData[];
        if (!mounted) return;
        setEnrollment(enrollments.find((e) => e.pathId === id) || null);
      }

      if (mounted) setLoading(false);
    };

    load().catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [id, user]);

  const difficultyBadge = useMemo(
    () => DIFF_COLORS[path?.difficulty || 'Beginner'] || DIFF_COLORS.Beginner,
    [path?.difficulty]
  );

  const completed = new Set(enrollment?.completedChallenges || []);

  const refreshEnrollment = async () => {
    if (!user) return;
    const enrollments = (await getUserEnrollments(user.uid)) as EnrollmentData[];
    setEnrollment(enrollments.find((e) => e.pathId === id) || null);
  };

  const handleEnroll = async () => {
    if (!user || !isAuthenticated) {
      setShowAuth(true);
      return;
    }

    try {
      await enrollInLearningPath(id, user.uid);
      showNotif('Enrolled successfully!', 'success');
      await refreshEnrollment();
    } catch {
      showNotif('Could not enroll. Try again.', 'error');
    }
  };

  const handleMarkComplete = async (challengeId: string) => {
    if (!user || !isAuthenticated) {
      setShowAuth(true);
      return;
    }

    try {
      setUpdating(challengeId);
      await updateLearningProgress(id, user.uid, challengeId);
      await refreshEnrollment();
      showNotif('Progress updated!', 'success');
    } catch {
      showNotif('Could not update progress.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <ShimmerCard height={160} />
        <ShimmerCard height={220} />
      </div>
    );
  }

  if (!path) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#5A5A80' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: '#8B8BAD' }}>Learning path not found</div>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push('/learn')}>
          ← Back to Learning Paths
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/learn')}>
        ← Back to Learning Paths
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span className="tag" style={{ background: difficultyBadge.bg, color: difficultyBadge.color }}>{path.difficulty}</span>
              <span style={{ color: '#8B8BAD', fontSize: 13 }}>{path.estimatedTime}</span>
            </div>

            <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              {path.title}
            </h1>
            <p style={{ color: '#8B8BAD', lineHeight: 1.6, marginBottom: 14 }}>{path.description}</p>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Challenges</div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{path.challenges.length}</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Enrolled</div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{path.enrolledCount}</div>
              </div>
              <div className="stat-card" style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#8B8BAD' }}>Completion</div>
                <div style={{ fontWeight: 700, fontSize: 22 }}>{enrollment?.progress ?? path.completionRate}%</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, marginBottom: 12 }}>📘 Curriculum</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {path.challenges.map((challengeId, idx) => {
                const done = completed.has(challengeId);
                return (
                  <div key={challengeId} style={{ background: '#16213E', borderRadius: 10, padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 13, color: '#8B8BAD' }}>Lesson {idx + 1}</div>
                        <div style={{ fontWeight: 600 }}>{challengeId}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" onClick={() => router.push(`/challenges/${challengeId}`)}>
                          Open Challenge
                        </button>
                        <button
                          className="btn-primary"
                          disabled={done || updating === challengeId}
                          onClick={() => handleMarkComplete(challengeId)}
                        >
                          {done ? '✓ Completed' : updating === challengeId ? 'Saving...' : 'Mark Complete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ padding: 20, position: 'sticky', top: 80 }}>
            <div style={{ fontSize: 13, color: '#8B8BAD', marginBottom: 8 }}>Your Progress</div>
            <div className="progress-bar" style={{ marginBottom: 8 }}>
              <div className="progress-fill" style={{ width: `${enrollment?.progress ?? 0}%` }} />
            </div>
            <div style={{ color: '#8B8BAD', fontSize: 13 }}>{enrollment?.progress ?? 0}% completed</div>

            {!enrollment ? (
              <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={handleEnroll}>
                Enroll in Path
              </button>
            ) : (
              <button className="btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={() => router.push(`/challenges/${path.challenges[0]}`)}>
                Continue Learning
              </button>
            )}

            <button className="btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => router.push('/learn')}>
              Browse More Paths
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
