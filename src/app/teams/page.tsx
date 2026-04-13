'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAppStore } from '@/stores/useAppStore';
import AuthModal from '@/components/auth/AuthModal';

interface TeamMember {
  name: string;
  role: string;
  skills: string[];
  college: string;
  avatar: string;
}

// Static sample teammates to display while Firebase isn't configured
const SAMPLE_MEMBERS: TeamMember[] = [
  { name: 'Priya Sharma',   role: 'Full Stack Dev', skills: ['React', 'Node', 'MongoDB'],    college: 'IIT Delhi',    avatar: 'PS' },
  { name: 'Aryan Gupta',    role: 'ML Engineer',    skills: ['Python', 'TensorFlow', 'CV'],  college: 'BITS Pilani',  avatar: 'AG' },
  { name: 'Sneha Reddy',    role: 'UI/UX Designer', skills: ['Figma', 'React', 'CSS'],       college: 'NIT Trichy',   avatar: 'SR' },
  { name: 'Rahul Verma',    role: 'Backend Dev',    skills: ['Go', 'PostgreSQL', 'Redis'],   college: 'IIT Bombay',   avatar: 'RV' },
  { name: 'Aisha Khan',     role: 'Data Scientist', skills: ['R', 'Spark', 'Tableau'],       college: 'IIT Madras',   avatar: 'AK' },
  { name: 'Dev Patel',      role: 'iOS Developer',  skills: ['Swift', 'SwiftUI', 'CoreML'],  college: 'IIIT Hyderabad', avatar: 'DP' },
];

export default function TeamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthContext();
  const { showNotif } = useAppStore();

  const [showAuth, setShowAuth] = useState(false);
  const [filter, setFilter] = useState('All');
  const [sending, setSending] = useState<string | null>(null);
  const eventId = searchParams.get('eventId') || '';

  const skills = ['All', 'React', 'Python', 'ML', 'Node', 'Go', 'iOS', 'Design'];

  const filtered = filter === 'All'
    ? SAMPLE_MEMBERS
    : SAMPLE_MEMBERS.filter((m) => m.skills.some((s) => s.toLowerCase().includes(filter.toLowerCase())));

  const handleSendRequest = async (member: TeamMember) => {
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    setSending(member.name);
    try {
      // In production this calls /api/teams/requests
      // For now simulate a success
      await new Promise((r) => setTimeout(r, 800));
      showNotif(`✓ Team request sent to ${member.name}!`, 'success');
    } catch {
      showNotif('Failed to send request. Please try again.', 'error');
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="fade-in">
      {showAuth && <AuthModal isOpen onClose={() => setShowAuth(false)} />}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
          🤝 Find Teammates
        </h1>
        <p style={{ color: '#8B8BAD' }}>
          {eventId
            ? `Find teammates for this event`
            : 'Connect with talented developers, designers, and data scientists'}
        </p>
      </div>

      {/* Auth prompt banner — shown when not logged in */}
      {!isAuthenticated && (
        <div
          style={{
            background: '#6C3BFF22',
            border: '1px solid #6C3BFF44',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#E0E0FF', fontSize: 14 }}>
              Sign in to send team requests
            </div>
            <div style={{ color: '#8B8BAD', fontSize: 13 }}>
              You can browse teammates without signing in
            </div>
          </div>
          <button
            className="btn-primary"
            style={{ padding: '8px 20px', fontSize: 13, whiteSpace: 'nowrap' }}
            onClick={() => setShowAuth(true)}
          >
            Sign In
          </button>
        </div>
      )}

      {/* Skill filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {skills.map((s) => (
          <button
            key={s}
            className="pill"
            onClick={() => setFilter(s)}
            style={{
              background: filter === s ? '#6C3BFF33' : '#1E1E35',
              color: filter === s ? '#8B5CF6' : '#8B8BAD',
              border: `1px solid ${filter === s ? '#6C3BFF' : '#2D2D50'}`,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Members grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {filtered.map((member) => (
          <div key={member.name} className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: '#6C3BFF33', color: '#8B5CF6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16, flexShrink: 0,
                }}
              >
                {member.avatar}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#F0F0FF', fontSize: 15 }}>{member.name}</div>
                <div style={{ color: '#8B5CF6', fontSize: 13 }}>{member.role}</div>
                <div style={{ color: '#8B8BAD', fontSize: 12 }}>{member.college}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="tag"
                  style={{ background: '#16213E', color: '#8B8BAD', fontSize: 11 }}
                >
                  {skill}
                </span>
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ width: '100%', fontSize: 13, padding: '8px' }}
              disabled={sending === member.name}
              onClick={() => handleSendRequest(member)}
            >
              {sending === member.name ? 'Sending...' : '🤝 Send Request'}
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#5A5A80' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 18, color: '#8B8BAD' }}>No teammates found for "{filter}"</div>
        </div>
      )}
    </div>
  );
}