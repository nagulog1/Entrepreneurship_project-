'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore, useLevel } from '@/stores/useAppStore';
import { useAuthContext } from '@/contexts/AuthContext';
import { logAnalyticsEvent } from '@/lib/analytics';
import AuthModal from '@/components/auth/AuthModal';

const NAV_ITEMS = [
  { href: '/', label: '🏠 Home' },
  { href: '/events', label: '🎯 Events' },
  { href: '/challenges', label: '⚡ Challenges' },
  { href: '/contests', label: '🏆 Contests' },
  { href: '/learn', label: '📚 Learn' },
  { href: '/teams', label: '🤝 Teams' },
  { href: '/forum', label: '💬 Forum' },
  { href: '/leaderboard', label: '📊 Leaderboard' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { xp, notification, clearNotif } = useAppStore();
  const { level, levelTitle } = useLevel();
  const { isAuthenticated, userProfile, user, signOut, loading } = useAuthContext();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await logAnalyticsEvent('menu_click', { item: 'sign_out' });
    await signOut();
    router.push('/');
  };

  // Avatar: real photo URL or initials
  const avatarLetter =
    userProfile?.displayName?.charAt(0).toUpperCase() ||
    user?.displayName?.charAt(0).toUpperCase() ||
    'U';

  const photoURL = user?.photoURL;

  return (
    <>
      {/* ── Notification Toast ── */}
      {notification && (
        <div
          className="notif"
          style={{
            background: notification.type === 'success' ? '#052E2B' : '#3A1016',
            border: `1px solid ${notification.type === 'success' ? '#10B98188' : '#EF444488'}`,
            color: notification.type === 'success' ? '#E8FFF6' : '#FFECEE',
            cursor: 'pointer',
          }}
          onClick={clearNotif}
        >
          {notification.msg}
        </div>
      )}

      {/* ── Header Bar ── */}
      <header
        style={{
          background: '#0F0F1A',
          borderBottom: '1px solid #2D2D50',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
            marginRight: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(135deg,#6C3BFF,#8B5CF6)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ⚡
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: '#F0F0FF',
            }}
          >
            Uni-O
          </span>
        </Link>

        {/* Nav Items */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, overflowX: 'auto' }}>
          {NAV_ITEMS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? 'active' : ''}`}
              onClick={() => {
                void logAnalyticsEvent('select_content', {
                  content_type: 'navigation',
                  content_id: href,
                  content_label: label,
                });
              }}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* Right Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* XP Badge */}
          <div
            style={{
              background: '#6C3BFF22',
              border: '1px solid #6C3BFF44',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              color: '#8B5CF6',
              whiteSpace: 'nowrap',
            }}
          >
            ⚡ {xp.toLocaleString()} XP · Lv.{level} {levelTitle}
          </div>

          {/* Auth section */}
          {loading ? (
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: '#2D2D50',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ) : isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              {/* Avatar button */}
              <button
                onClick={() => setShowUserMenu((v) => !v)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: '2px solid #6C3BFF55',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  padding: 0,
                  background: photoURL ? 'transparent' : 'linear-gradient(135deg,#6C3BFF,#8B5CF6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoURL} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  avatarLetter
                )}
              </button>

              {/* Dropdown */}
              {showUserMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 42,
                      right: 0,
                      background: '#1E1E35',
                      border: '1px solid #2D2D50',
                      borderRadius: 12,
                      padding: 8,
                      minWidth: 180,
                      zIndex: 200,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}
                  >
                    {/* User info */}
                    <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid #2D2D50', marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#F0F0FF' }}>
                        {userProfile?.displayName || user?.displayName || 'User'}
                      </div>
                      <div style={{ fontSize: 12, color: '#5A5A80', marginTop: 2 }}>
                        {user?.email}
                      </div>
                    </div>

                    {[
                      { label: '👤 My Profile', href: '/profile' },
                      { label: '🔔 Notifications', href: '/notifications' },
                    ].map(({ label, href }) => (
                      <button
                        key={href}
                        onClick={() => {
                          setShowUserMenu(false);
                          void logAnalyticsEvent('menu_click', { item: href });
                          router.push(href);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#A0A0C0',
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#2D2D50'; (e.currentTarget as HTMLButtonElement).style.color = '#F0F0FF'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#A0A0C0'; }}
                      >
                        {label}
                      </button>
                    ))}

                    <div style={{ borderTop: '1px solid #2D2D50', marginTop: 8, paddingTop: 8 }}>
                      <button
                        onClick={handleSignOut}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 12px',
                          color: '#EF4444',
                          fontSize: 13,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              className="btn-primary"
              style={{ padding: '7px 16px', fontSize: 13 }}
              onClick={() => {
                void logAnalyticsEvent('auth_modal_open', { source: 'header' });
                setShowAuthModal(true);
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}
