'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  addThreadReply,
  getForumThreadById,
  getThreadReplies,
  incrementThreadViews,
  upvoteThread,
} from '@/lib/firebase/firestore';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import AuthModal from '@/components/auth/AuthModal';
import MarkdownRenderer from '@/components/shared/MarkdownRenderer';
import ShimmerCard from '@/components/shared/ShimmerCard';
import type { ForumReply, ForumThread } from '@/types';

function timeAgo(ts: unknown): string {
  if (!ts) return 'just now';
  let date: Date;
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    date = (ts as { toDate: () => Date }).toDate();
  } else {
    date = new Date(ts as string | number);
  }
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ForumThreadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, userProfile, isAuthenticated } = useAuthContext();
  const { showNotif } = useAppStore();

  const [thread, setThread] = useState<ForumThread | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([getForumThreadById(id), getThreadReplies(id)])
      .then(([threadDoc, replyDocs]) => {
        if (!mounted) return;
        setThread(threadDoc);
        setReplies(replyDocs);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    incrementThreadViews(id).catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [id]);

  const handleUpvote = async () => {
    if (!thread) return;
    await upvoteThread(thread.id || id);
    setThread({ ...thread, upvotes: (thread.upvotes || 0) + 1 });
  };

  const handleReply = async () => {
    if (!isAuthenticated || !user) {
      setShowAuth(true);
      return;
    }
    if (replyText.trim().length < 2) {
      showNotif('Reply is too short.', 'error');
      return;
    }

    try {
      setSubmitting(true);
      await addThreadReply(id, {
        authorId: user.uid,
        authorName: userProfile?.displayName || user.displayName || 'Anonymous',
        authorPhoto: user.photoURL || '',
        content: replyText.trim(),
      });
      const latest = await getThreadReplies(id);
      setReplies(latest);
      setReplyText('');
      setThread((prev) => (prev ? { ...prev, replies: (prev.replies || 0) + 1 } : prev));
      showNotif('Reply posted!', 'success');
    } catch {
      showNotif('Could not post reply. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'grid', gap: 12 }}>
        <ShimmerCard height={140} />
        <ShimmerCard height={220} />
        <ShimmerCard height={200} />
      </div>
    );
  }

  if (!thread) {
    return (
      <div style={{ textAlign: 'center', padding: 80, color: '#5A5A80' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <div style={{ fontSize: 18, color: '#8B8BAD' }}>Thread not found</div>
        <button className="btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push('/forum')}>
          ← Back to Forum
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => router.push('/forum')}>
        ← Back to Forum
      </button>

      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {thread.isPinned && <span className="tag" style={{ background: '#F59E0B22', color: '#F59E0B' }}>📌 Pinned</span>}
          {thread.isSolved && <span className="tag" style={{ background: '#10B98122', color: '#10B981' }}>✓ Solved</span>}
          <span className="tag" style={{ background: '#16213E', color: '#8B8BAD' }}>{thread.category}</span>
          {thread.tags?.map((tag) => (
            <span key={tag} className="tag" style={{ background: '#6C3BFF22', color: '#8B5CF6' }}>#{tag}</span>
          ))}
        </div>

        <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 10 }}>
          {thread.title}
        </h1>

        <div style={{ color: '#8B8BAD', fontSize: 13, marginBottom: 18 }}>
          {thread.authorName} · {timeAgo(thread.createdAt)}
        </div>

        <MarkdownRenderer content={thread.content} />

        <div style={{ display: 'flex', gap: 16, marginTop: 18 }}>
          <button className="btn-ghost" onClick={handleUpvote}>▲ Upvote ({thread.upvotes || 0})</button>
          <span style={{ color: '#8B8BAD', fontSize: 13, alignSelf: 'center' }}>💬 {thread.replies || 0} replies</span>
          <span style={{ color: '#8B8BAD', fontSize: 13, alignSelf: 'center' }}>👁 {thread.views || 0} views</span>
        </div>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, marginBottom: 12 }}>Add Reply</h3>
        <textarea
          className="input"
          rows={5}
          placeholder="Share your thoughts..."
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }}
        />
        <button className="btn-primary" onClick={handleReply} disabled={submitting}>
          {submitting ? 'Posting...' : 'Post Reply'}
        </button>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, marginBottom: 12 }}>Replies ({replies.length})</h3>
        {replies.length === 0 ? (
          <div style={{ color: '#8B8BAD' }}>No replies yet. Be the first to reply.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replies.map((reply) => (
              <div key={reply.id} style={{ background: '#16213E', borderRadius: 10, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600 }}>{reply.authorName}</div>
                  <div style={{ color: '#8B8BAD', fontSize: 12 }}>{timeAgo(reply.createdAt)}</div>
                </div>
                <MarkdownRenderer content={reply.content} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
