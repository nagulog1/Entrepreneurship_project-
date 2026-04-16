'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import {
  getContests,
  createContest,
  registerForContest,
  seedContestsToFirestore,
} from '@/lib/firebase/firestore';
import { Timestamp } from 'firebase/firestore';
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

// ─── Add Contest Modal ────────────────────────────────────────────────────────

interface AddContestModalProps {
  onClose: () => void;
  onCreated: (contest: Contest) => void;
  userId: string;
}

function AddContestModal({ onClose, onCreated, userId }: AddContestModalProps) {
  const { showNotif } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [duration, setDuration] = useState('90');
  const [status, setStatus] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [prizes, setPrizes] = useState([
    { position: 1, amount: 5000, description: '🥇 1st Place' },
    { position: 2, amount: 3000, description: '🥈 2nd Place' },
    { position: 3, amount: 1000, description: '🥉 3rd Place' },
  ]);

  const overlayRef = useRef<HTMLDivElement>(null);

  const handlePrize = (
    idx: number,
    field: 'amount' | 'description',
    value: string
  ) => {
    setPrizes((prev) =>
      prev.map((p, i) =>
        i === idx ? { ...p, [field]: field === 'amount' ? Number(value) : value } : p
      )
    );
  };

  const addPrize = () =>
    setPrizes((prev) => [
      ...prev,
      { position: prev.length + 1, amount: 0, description: '' },
    ]);

  const removePrize = (idx: number) =>
    setPrizes((prev) =>
      prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, position: i + 1 }))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!startDate) { setError('Start date is required.'); return; }
    if (!duration || Number(duration) <= 0) { setError('Duration must be > 0.'); return; }

    const startMs = new Date(`${startDate}T${startTime}:00`).getTime();
    const endMs = startMs + Number(duration) * 60000;

    if (isNaN(startMs)) { setError('Invalid start date/time.'); return; }

    setSaving(true);
    try {
      const contestData: Omit<Contest, 'id' | 'createdAt'> = {
        title: title.trim(),
        description: description.trim(),
        startTime: Timestamp.fromMillis(startMs),
        endTime: Timestamp.fromMillis(endMs),
        duration: Number(duration),
        challenges: [],
        participants: 0,
        status,
        prizes: prizes.filter((p) => p.description),
      };
      const id = await createContest(contestData, userId);
      const newContest: Contest = {
        id,
        ...contestData,
        createdAt: Timestamp.now(),
      };
      showNotif(`Contest "${title}" created! 🎉`, 'success');
      onCreated(newContest);
      onClose();
    } catch (err) {
      setError((err as Error).message ?? 'Failed to create contest.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg,#16213E,#1E1E35)',
          border: '1px solid #2D2D50',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: '#F0F0FF', margin: 0 }}>
            ➕ Add Contest
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#8B8BAD', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Title */}
          <label style={labelStyle}>Contest Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Challenge #43"
            style={inputStyle}
            required
          />

          {/* Description */}
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the contest..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {/* Date + Time row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Duration + Status row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Duration (minutes) *</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min={1}
                placeholder="90"
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'upcoming' | 'live' | 'ended')}
                style={{ ...inputStyle, appearance: 'none' }}
              >
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="ended">Ended</option>
              </select>
            </div>
          </div>

          {/* Prizes */}
          <label style={{ ...labelStyle, marginTop: 8 }}>Prizes</label>
          {prizes.map((p, idx) => (
            <div
              key={idx}
              style={{ display: 'grid', gridTemplateColumns: '36px 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}
            >
              <span style={{ color: '#8B8BAD', fontSize: 13, textAlign: 'center' }}>#{p.position}</span>
              <input
                value={p.description}
                onChange={(e) => handlePrize(idx, 'description', e.target.value)}
                placeholder="Label"
                style={{ ...inputStyle, marginBottom: 0, padding: '8px 10px', fontSize: 13 }}
              />
              <input
                type="number"
                value={p.amount}
                onChange={(e) => handlePrize(idx, 'amount', e.target.value)}
                placeholder="₹ Amount"
                min={0}
                style={{ ...inputStyle, marginBottom: 0, padding: '8px 10px', fontSize: 13 }}
              />
              <button
                type="button"
                onClick={() => removePrize(idx)}
                style={{ background: '#EF444422', border: 'none', borderRadius: 6, color: '#EF4444', cursor: 'pointer', padding: '4px 10px', fontSize: 16 }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPrize}
            style={{
              background: '#6C3BFF22', border: '1px dashed #6C3BFF44',
              borderRadius: 8, color: '#8B5CF6', cursor: 'pointer',
              padding: '8px 16px', fontSize: 13, width: '100%', marginBottom: 16,
            }}
          >
            + Add Prize Tier
          </button>

          {error && (
            <div style={{ background: '#EF444422', border: '1px solid #EF444444', borderRadius: 8, padding: '10px 14px', color: '#EF4444', fontSize: 13, marginBottom: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ flex: 1, background: '#1E1E35', border: '1px solid #2D2D50', borderRadius: 10, color: '#8B8BAD', cursor: 'pointer', padding: '12px', fontSize: 14 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 2,
                background: saving ? '#4A2EBB' : 'linear-gradient(135deg,#6C3BFF,#9C6BFF)',
                border: 'none', borderRadius: 10,
                color: '#fff', cursor: saving ? 'not-allowed' : 'pointer',
                padding: '12px', fontSize: 14, fontWeight: 700,
                transition: 'opacity 0.2s',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Creating…' : '🏆 Create Contest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#8B8BAD',
  marginBottom: 6,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0D0D1A',
  border: '1px solid #2D2D50',
  borderRadius: 10,
  color: '#F0F0FF',
  padding: '10px 14px',
  fontSize: 14,
  marginBottom: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

// ─── Contest Card ─────────────────────────────────────────────────────────────

function ContestCard({ contest, onRegister }: { contest: Contest; onRegister: (c: Contest) => void }) {
  const router = useRouter();

  const start = toDate(contest.startTime);
  const end   = toDate(contest.endTime);

  const statusColors: Record<string, { bg: string; color: string }> = {
    upcoming: { bg: '#F59E0B22', color: '#F59E0B' },
    live:     { bg: '#EF444422', color: '#EF4444' },
    ended:    { bg: '#5A5A8022', color: '#5A5A80' },
  };
  const sc = statusColors[contest.status] ?? statusColors.ended;

  const totalPrize = (contest.prizes ?? []).reduce((s, p) => s + p.amount, 0);

  return (
    <div
      className="card"
      style={{
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(108,59,255,0.15)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '';
      }}
    >
      {/* Subtle glow for live */}
      {contest.status === 'live' && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg,#EF4444,#FF6B6B,#EF4444)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s linear infinite',
        }} />
      )}

      {/* Status badge row */}
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
          {contest.duration} min · {(contest.challenges ?? []).length} problems
        </span>
      </div>

      <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#F0F0FF' }}>
        {contest.title}
      </h3>
      <p style={{ color: '#8B8BAD', fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
        {contest.description}
      </p>

      {/* Prize + participants */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ background: '#16213E', borderRadius: 8, padding: '10px 14px', flex: 1, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 18, color: '#F59E0B' }}>
            {totalPrize > 0 ? `₹${totalPrize.toLocaleString()}` : '–'}
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

      {/* Timer / ended info */}
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
            onClick={() => onRegister(contest)}
          >
            {contest.status === 'live' ? '▶ Join Now' : 'Register'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContestsPage() {
  const { isAuthenticated, user } = useAuthContext();
  const { showNotif } = useAppStore();

  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [showAdd, setShowAdd]   = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [seeded, setSeeded]     = useState(false);

  // Seed + fetch
  const loadContests = async (userId?: string) => {
    try {
      // Seed on first authenticated load
      if (userId && !seeded) {
        await seedContestsToFirestore(userId);
        setSeeded(true);
      }
      const data = await getContests();
      setContests(data);
    } catch {
      setContests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContests(user?.uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const handleRegister = async (contest: Contest) => {
    if (!isAuthenticated || !user) { setShowAuth(true); return; }
    try {
      await registerForContest(contest.id, user.uid);
      showNotif(`Registered for ${contest.title}! 🎉`, 'success');
      // Optimistically bump participants count
      setContests((prev) =>
        prev.map((c) =>
          c.id === contest.id ? { ...c, participants: c.participants + 1 } : c
        )
      );
    } catch {
      showNotif('Failed to register. Please try again.', 'error');
    }
  };

  const handleContestCreated = (contest: Contest) => {
    setContests((prev) => [contest, ...prev]);
    // Switch to the tab matching the new contest's status
    setTab(contest.status);
  };

  const filtered = contests.filter((c) => c.status === tab);

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}
      {showAdd && isAuthenticated && user && (
        <AddContestModal
          onClose={() => setShowAdd(false)}
          onCreated={handleContestCreated}
          userId={user.uid}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
            🏆 Contests
          </h1>
          <p style={{ color: '#8B8BAD' }}>Compete in timed coding contests and climb the leaderboard</p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 20px', whiteSpace: 'nowrap' }}
          onClick={() => {
            if (!isAuthenticated) { setShowAuth(true); return; }
            setShowAdd(true);
          }}
        >
          ➕ Add Contest
        </button>
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
                transition: 'all 0.2s',
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
          {[1, 2, 3].map((i) => <ShimmerCard key={i} height={300} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5A80' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 18, color: '#8B8BAD' }}>No {tab} contests</div>
          <p style={{ fontSize: 14, marginTop: 8 }}>
            {isAuthenticated
              ? 'Click "Add Contest" to create one!'
              : 'Sign in to create contests or check back soon!'}
          </p>
          <button
            className="btn-primary"
            style={{ marginTop: 20, fontSize: 14, padding: '10px 24px' }}
            onClick={() => {
              if (!isAuthenticated) { setShowAuth(true); return; }
              setShowAdd(true);
            }}
          >
            ➕ Add Contest
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16 }}>
          {filtered.map((c) => (
            <ContestCard key={c.id} contest={c} onRegister={handleRegister} />
          ))}
        </div>
      )}
    </div>
  );
}
