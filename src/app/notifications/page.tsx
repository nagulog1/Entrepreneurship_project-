'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  markNotificationRead,
  markAllNotificationsRead,
  acceptTeamRequest,
  rejectTeamRequest,
} from '@/lib/firebase/firestore';
import { useAppStore } from '@/stores/useAppStore';
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

// ─── helper: is this a pending incoming teammate request? ─────────────────────

function isIncomingTeamRequest(notif: FirestoreNotification, myUid: string): boolean {
  if (notif.type !== 'team') return false;
  const meta = notif.metadata as Record<string, unknown> | undefined;
  if (!meta?.requestId) return false;
  // It's incoming if toUserId is ME (i.e. someone else sent it to me)
  if (meta.toUserId === myUid) return true;
  return false;
}

function isAlreadyActioned(notif: FirestoreNotification): boolean {
  const meta = notif.metadata as Record<string, unknown> | undefined;
  return meta?.action === 'accepted' || meta?.action === 'rejected';
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({
  notif,
  myUid,
  myName,
  onRead,
  onAccept,
  onReject,
  actionLoading,
}: {
  notif: FirestoreNotification;
  myUid: string;
  myName: string;
  onRead: (id: string, link: string) => void;
  onAccept: (notif: FirestoreNotification) => void;
  onReject: (notif: FirestoreNotification) => void;
  actionLoading: string | null;
}) {
  const icon = TYPE_ICONS[notif.type] ?? '🔔';
  const isUnread = !notif.isRead;
  const showActions = isIncomingTeamRequest(notif, myUid) && !isAlreadyActioned(notif);
  const meta = notif.metadata as Record<string, unknown> | undefined;
  const requestId = meta?.requestId as string | undefined;
  const isLoading = actionLoading === requestId;

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '14px 18px',
        borderRadius: 10,
        cursor: showActions ? 'default' : 'pointer',
        background: isUnread ? '#6C3BFF0A' : 'transparent',
        border: `1px solid ${isUnread ? '#6C3BFF22' : 'transparent'}`,
        marginBottom: 6,
        transition: 'all 0.2s',
      }}
      onClick={() => {
        if (!showActions) onRead(notif.id!, notif.link);
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

        {/* Accept / Reject buttons for incoming team requests */}
        {showActions && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn-primary"
              disabled={isLoading}
              style={{
                padding: '6px 18px',
                fontSize: 13,
                borderRadius: 8,
                opacity: isLoading ? 0.6 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onAccept(notif);
              }}
            >
              {isLoading ? 'Processing…' : '✓ Accept'}
            </button>
            <button
              className="btn-ghost"
              disabled={isLoading}
              style={{
                padding: '6px 18px',
                fontSize: 13,
                borderRadius: 8,
                color: '#EF4444',
                borderColor: '#EF444433',
                opacity: isLoading ? 0.6 : 1,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onReject(notif);
              }}
            >
              ✕ Decline
            </button>
          </div>
        )}

        <div style={{ fontSize: 11, color: '#5A5A80', marginTop: showActions ? 6 : 0 }}>
          {timeAgo(notif.createdAt)}
        </div>
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
  const { isAuthenticated, user, userProfile } = useAuthContext();
  const { showNotif } = useAppStore();

  const [notifs, setNotifs]         = useState<FirestoreNotification[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showAuth, setShowAuth]     = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const myName = userProfile?.displayName || user?.displayName || user?.email || 'Someone';

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

  const handleAcceptRequest = async (notif: FirestoreNotification) => {
    if (!user) return;
    const meta = notif.metadata as Record<string, unknown> | undefined;
    const requestId = meta?.requestId as string | undefined;
    if (!requestId) return;

    setActionLoading(requestId);
    try {
      await acceptTeamRequest(requestId, user.uid, myName);
      // Mark the notification as read
      if (notif.id) await markNotificationRead(user.uid, notif.id);
      showNotif(`Accepted teammate request from ${meta?.fromUserName ?? 'user'}! 🎉`, 'success');
    } catch {
      showNotif('Failed to accept request. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (notif: FirestoreNotification) => {
    if (!user) return;
    const meta = notif.metadata as Record<string, unknown> | undefined;
    const requestId = meta?.requestId as string | undefined;
    if (!requestId) return;

    setActionLoading(requestId);
    try {
      await rejectTeamRequest(requestId, user.uid, myName);
      if (notif.id) await markNotificationRead(user.uid, notif.id);
      showNotif('Request declined.', 'success');
    } catch {
      showNotif('Failed to decline request. Please try again.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const unreadCount = notifs.filter((n) => !n.isRead).length;
  const pendingRequests = notifs.filter((n) => user && isIncomingTeamRequest(n, user.uid) && !isAlreadyActioned(n));
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
              {pendingRequests.length > 0 && (
                <span style={{ color: '#F59E0B', marginLeft: 8 }}>
                  · {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button className="btn-ghost" onClick={handleMarkAll}>
            ✓ Mark all as read
          </button>
        )}
      </div>

      {/* Pending Requests Banner */}
      {pendingRequests.length > 0 && (
        <div
          style={{
            background: 'linear-gradient(135deg, #6C3BFF11, #F59E0B11)',
            border: '1px solid #6C3BFF33',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 28 }}>🤝</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#F0F0FF', marginBottom: 2 }}>
              {pendingRequests.length} Pending Teammate Request{pendingRequests.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 13, color: '#8B8BAD' }}>
              People want to team up with you! Accept or decline below.
            </div>
          </div>
        </div>
      )}

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
                  <NotifRow
                    key={n.id}
                    notif={n}
                    myUid={user?.uid ?? ''}
                    myName={myName}
                    onRead={handleRead}
                    onAccept={handleAcceptRequest}
                    onReject={handleRejectRequest}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
