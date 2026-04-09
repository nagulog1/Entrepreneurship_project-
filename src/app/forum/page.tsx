'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import {
  getForumThreads,
  createForumThread,
} from '@/lib/firebase/firestore';
import ShimmerCard from '@/components/shared/ShimmerCard';
import AuthModal from '@/components/auth/AuthModal';
import type { ForumThread } from '@/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all',               label: '🌐 All' },
  { value: 'general',           label: '💬 General' },
  { value: 'event_experiences', label: '🎯 Event Experiences' },
  { value: 'challenge_help',    label: '⚡ Challenge Help' },
  { value: 'team_formation',    label: '🤝 Team Formation' },
  { value: 'career',            label: '💼 Career' },
  { value: 'off_topic',         label: '🎮 Off Topic' },
] as const;

const CAT_LABELS: Record<string, string> = {
  general:           '💬 General',
  event_experiences: '🎯 Event',
  challenge_help:    '⚡ Challenge',
  team_formation:    '🤝 Teams',
  career:            '💼 Career',
  off_topic:         '🎮 Off Topic',
};

// ─── New Thread Schema ────────────────────────────────────────────────────────

const threadSchema = z.object({
  title:    z.string().min(5, 'Title must be at least 5 characters'),
  category: z.enum(['general','event_experiences','challenge_help','team_formation','career','off_topic']),
  tags:     z.string().optional(),
  content:  z.string().min(20, 'Content must be at least 20 characters'),
});
type ThreadForm = z.infer<typeof threadSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(ts: unknown): string {
  if (!ts) return '';
  // Firestore Timestamp has .toDate(), plain Date, or epoch number
  let date: Date;
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    date = (ts as { toDate: () => Date }).toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else {
    date = new Date(ts as number);
  }
  const diff = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ─── Thread Row ───────────────────────────────────────────────────────────────

function ThreadRow({ thread }: { thread: ForumThread }) {
  const router = useRouter();
  return (
    <div
      className="card"
      style={{ padding: '16px 20px', cursor: 'pointer', marginBottom: 8 }}
      onClick={() => router.push(`/forum/${thread.id}`)}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Author avatar */}
        <div
          className="avatar"
          style={{
            width: 38, height: 38, fontSize: 14, flexShrink: 0,
            background: '#6C3BFF33', color: '#8B5CF6',
          }}
        >
          {thread.authorName?.charAt(0).toUpperCase() || 'U'}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            {thread.isPinned && <span style={{ fontSize: 12 }}>📌</span>}
            <span
              style={{
                fontWeight: 700, fontSize: 15, color: '#F0F0FF',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {thread.isSolved && <span style={{ color: '#10B981', marginRight: 6 }}>✓</span>}
              {thread.title}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="tag" style={{ background: '#16213E', color: '#8B8BAD', fontSize: 11 }}>
              {CAT_LABELS[thread.category] ?? thread.category}
            </span>
            {thread.tags?.slice(0, 3).map((t) => (
              <span key={t} className="tag" style={{ background: '#6C3BFF22', color: '#8B5CF6', fontSize: 11 }}>
                #{t}
              </span>
            ))}
            <span style={{ fontSize: 12, color: '#5A5A80', marginLeft: 'auto' }}>
              {thread.authorName} · {timeAgo(thread.createdAt)}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, flexShrink: 0, fontSize: 13, color: '#8B8BAD' }}>
          <span title="Upvotes">▲ {thread.upvotes ?? 0}</span>
          <span title="Replies">💬 {thread.replies ?? 0}</span>
          <span title="Views">👁 {thread.views ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// ─── New Thread Modal ─────────────────────────────────────────────────────────

function NewThreadModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { user, userProfile } = useAuthContext();
  const { showNotif } = useAppStore();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ThreadForm>({ resolver: zodResolver(threadSchema) });

  const onSubmit = async (data: ThreadForm) => {
    if (!user) return;
    try {
      const id = await createForumThread({
        title:      data.title,
        category:   data.category,
        tags:       data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        content:    data.content,
        authorId:   user.uid,
        authorName: userProfile?.displayName || user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
      });
      showNotif('Thread posted! 🎉', 'success');
      onCreated(id);
      router.push(`/forum/${id}`);
    } catch {
      showNotif('Failed to post thread. Try again.', 'error');
    }
  };

  const inputStyle = {
    width: '100%', background: '#0F0F1A', border: '1px solid #2D2D50',
    borderRadius: 8, padding: '10px 14px', color: '#F0F0FF', fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)', zIndex: 9998,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#1E1E35', border: '1px solid #2D2D50', borderRadius: 16,
        padding: 32, width: '100%', maxWidth: 560, position: 'relative',
        animation: 'fadeIn 0.2s ease',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: '#8B8BAD', fontSize: 20, cursor: 'pointer' }}
        >✕</button>

        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
          New Thread
        </h2>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#A0A0C0', marginBottom: 6 }}>Title *</label>
            <input {...register('title')} placeholder="What's your question or topic?" style={inputStyle} />
            {errors.title && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.title.message}</p>}
          </div>

          {/* Category */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#A0A0C0', marginBottom: 6 }}>Category *</label>
            <select {...register('category')} style={{ ...inputStyle, cursor: 'pointer' }}>
              {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#A0A0C0', marginBottom: 6 }}>Tags (comma-separated)</label>
            <input {...register('tags')} placeholder="react, hackathon, help" style={inputStyle} />
          </div>

          {/* Content */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, color: '#A0A0C0', marginBottom: 6 }}>Content * (Markdown supported)</label>
            <textarea
              {...register('content')}
              rows={6}
              placeholder="Describe your topic in detail..."
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
            {errors.content && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{errors.content.message}</p>}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isSubmitting
                ? <div style={{ width: 16, height: 16, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                : 'Post Thread'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ForumPage() {
  const { isAuthenticated } = useAuthContext();
  const [threads, setThreads]         = useState<ForumThread[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeCategory, setCategory] = useState('all');
  const [search, setSearch]           = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showAuth, setShowAuth]       = useState(false);

  useEffect(() => {
    setLoading(true);
    getForumThreads(activeCategory === 'all' ? undefined : activeCategory)
      .then((data) => setThreads(data))
      .finally(() => setLoading(false));
  }, [activeCategory]);

  const filtered = threads.filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  );

  // Pinned first
  const sorted = [...filtered].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));

  return (
    <div className="fade-in">
      {showNew && isAuthenticated && (
        <NewThreadModal
          onClose={() => setShowNew(false)}
          onCreated={() => setShowNew(false)}
        />
      )}
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 6 }}>
            💬 Community Forum
          </h1>
          <p style={{ color: '#8B8BAD' }}>Ask questions, share experiences, and help fellow students</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => isAuthenticated ? setShowNew(true) : setShowAuth(true)}
        >
          + New Thread
        </button>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CATEGORIES.map(({ value, label }) => (
          <button
            key={value}
            className="tab-btn"
            onClick={() => setCategory(value)}
            style={{
              background:  activeCategory === value ? '#6C3BFF33' : '#1E1E35',
              color:       activeCategory === value ? '#8B5CF6'   : '#8B8BAD',
              border:      `1px solid ${activeCategory === value ? '#6C3BFF44' : '#2D2D50'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        className="input"
        placeholder="🔍 Search threads..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 20 }}
      />

      {/* Thread List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <ShimmerCard key={i} height={80} />)}
        </div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#5A5A80' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
          <div style={{ fontSize: 18, color: '#8B8BAD', marginBottom: 8 }}>No threads yet</div>
          <p style={{ fontSize: 14 }}>Be the first to start a discussion!</p>
          <button
            className="btn-primary"
            style={{ marginTop: 16 }}
            onClick={() => isAuthenticated ? setShowNew(true) : setShowAuth(true)}
          >
            Start a Thread
          </button>
        </div>
      ) : (
        <div>
          {sorted.map((thread) => (
            <ThreadRow key={thread.id} thread={thread} />
          ))}
        </div>
      )}
    </div>
  );
}
