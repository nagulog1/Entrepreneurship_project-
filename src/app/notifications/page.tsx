'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/firebase/firestore';
import ShimmerCard from '@/components/shared/ShimmerCard';
import AuthModal from '@/components/auth/AuthModal';
import type { FirestoreNotification } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(ts: unknown): Date {
  if (!ts) return new Date();
  if (typeof (ts as { toDate?: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  return new Date(ts as number);
}

function timeAgo(ts: unknown): string {
  const date = toDate(ts);
  const diff  = Date.now() - date.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'just now';
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function groupByDate(notifs: FirestoreNotification[]): Record<string, FirestoreNotification[]> {
  const groups: Record<string, FirestoreNotification[]> = {};
  notifs.forEach((n) => {
    const date  = toDate(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (date.toDateString() === today.toDateString()) {
      label = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = 'Yesterday';
    } else {
      label = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  });
  return groups;
}

const TYPE_ICONS: Record<string, string> = {
  event:       '🎯',
  team:        '🤝',
  challenge:   '⚡',
  achievement: '🏆',
  social:      '👥',
  system:      '🔔',
};

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onRead,
}: {
  notif: FirestoreNotification;
  onRead: (id: string, link: string) => void;
}) {
  const icon = TYPE_ICONS[notif.type] ?? '🔔';
  const isUnread = !notif.isRead;

  return (
    <div
      onClick={() => onRead(notif.id!, notif.link)}
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '14px 18px',
        borderRadius: 10,
        cursor: 'pointer',
        background: isUnread ? '#6C3BFF0A' : 'transparent',
        border: `1px solid ${isUnread ? '#6C3BFF22' : 'transparent'}`,
        marginBottom: 6,
        transition: 'all 0.2s',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40, height: 40, flexShrink: 0, borderRadius: 10,
          background: isUnread ? '#6C3BFF22' : '#16213E',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: isUnread ? 600 : 500, fontSize: 14, color: '#F0F0FF', marginBottom: 3 }}>
          {notif.title}
        </div>
        <div style={{ fontSize: 13, color: '#8B8BAD', lineHeight: 1.4, marginBottom: 4 }}>
          {notif.message}
        </div>
        <div style={{ fontSize: 11, color: '#5A5A80' }}>{timeAgo(notif.createdAt)}</div>
      </div>

      {/* Unread dot */}
      {isUnread && (
        <div
          style={{
            width: 8, height: 8, borderRadius: '50%',
            background: '#6C3BFF', flexShrink: 0, marginTop: 6,
          }}
        />
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthContext();

  const [notifs, setNotifs]     = useState<FirestoreNotification[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  // Real-time listener
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const q = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreNotification));
      setNotifs(data);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [user]);

  const handleRead = async (id: string, link: string) => {
    if (!user || !id) return;
    await markNotificationRead(user.uid, id);
    if (link && link !== '#') router.push(link);
  };

  const handleMarkAll = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.uid);
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const grouped     = groupByDate(notifs);

  // ── Not authenticated ─────────────────────────────────────────────────────
  if (!isAuthenticated && !loading) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '80px 20px' }}>
        {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔔</div>
        <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Sign in to see notifications
        </h2>
        <p style={{ color: '#8B8BAD', marginBottom: 24 }}>
          Stay up-to-date with events, team requests, and achievements.
        </p>
        <button className="btn-primary" onClick={() => setShowAuth(true)}>
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 4 }}>
            🔔 Notifications
          </h1>
          {unreadCount > 0 && (
            <p style={{ color: '#8B8BAD', fontSize: 14 }}>
              You have{' '}
              <span style={{ color: '#6C3BFF', fontWeight: 600 }}>{unreadCount} unread</span>{' '}
              notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn-ghost" onClick={handleMarkAll}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4, 5].map((i) => <ShimmerCard key={i} height={72} />)}
        </div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#5A5A80' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🔕</div>
          <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, color: '#8B8BAD', marginBottom: 8 }}>
            All caught up!
          </h3>
          <p style={{ fontSize: 14 }}>No notifications yet. Start exploring events and challenges.</p>
          <button
            className="btn-primary"
            style={{ marginTop: 20 }}
            onClick={() => router.push('/events')}
          >
            Browse Events
          </button>
        </div>
      ) : (
        <div className="card" style={{ padding: '8px 0', overflow: 'hidden' }}>
          {Object.entries(grouped).map(([label, group]) => (
            <div key={label}>
              {/* Date label */}
              <div
                style={{
                  padding: '10px 18px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5A5A80',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                {label}
              </div>
              <div style={{ padding: '0 8px' }}>
                {group.map((n) => (
                  <NotifRow key={n.id} notif={n} onRead={handleRead} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
