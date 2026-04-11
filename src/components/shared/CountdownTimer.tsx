'use client';

import { useState, useEffect } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(targetDate: Date): TimeLeft | null {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer({
  targetDate,
  compact = false,
}: {
  targetDate: Date;
  compact?: boolean;
}) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(calcTimeLeft(targetDate));

  useEffect(() => {
    const id = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <span style={{ color: '#EF4444', fontWeight: 600, fontSize: compact ? 12 : 14 }}>
        Ended
      </span>
    );
  }

  if (compact) {
    const parts = [];
    if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
    parts.push(`${timeLeft.hours}h`);
    parts.push(`${String(timeLeft.minutes).padStart(2, '0')}m`);
    parts.push(`${String(timeLeft.seconds).padStart(2, '0')}s`);
    return (
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#F59E0B', fontSize: 13, fontWeight: 600 }}>
        {parts.join(' ')}
      </span>
    );
  }

  const blocks = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Mins', value: timeLeft.minutes },
    { label: 'Secs', value: timeLeft.seconds },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {blocks.map(({ label, value }) => (
        <div
          key={label}
          style={{
            background: '#16213E',
            border: '1px solid #2D2D50',
            borderRadius: 8,
            padding: '8px 12px',
            textAlign: 'center',
            minWidth: 52,
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', monospace",
              fontSize: 20,
              fontWeight: 700,
              color: '#F59E0B',
              lineHeight: 1,
            }}
          >
            {String(value).padStart(2, '0')}
          </div>
          <div style={{ fontSize: 10, color: '#5A5A80', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </div>
  );
}
