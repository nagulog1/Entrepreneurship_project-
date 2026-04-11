'use client';

import ReactMarkdown from 'react-markdown';

export default function MarkdownRenderer({
  content,
  compact = false,
}: {
  content: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{
        color: '#A0A0C0',
        lineHeight: 1.8,
        fontSize: compact ? 13 : 15,
      }}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 style={{ color: '#F0F0FF', fontSize: 22, fontWeight: 700, margin: '16px 0 8px', fontFamily: "'Space Grotesk', sans-serif" }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ color: '#F0F0FF', fontSize: 18, fontWeight: 700, margin: '14px 0 6px', fontFamily: "'Space Grotesk', sans-serif" }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ color: '#E0E0FF', fontSize: 15, fontWeight: 600, margin: '12px 0 4px' }}>{children}</h3>
          ),
          p: ({ children }) => (
            <p style={{ marginBottom: 12, color: '#A0A0C0' }}>{children}</p>
          ),
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock ? (
              <pre style={{ background: '#0D0D1A', borderRadius: 8, padding: 16, overflowX: 'auto', marginBottom: 12 }}>
                <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#E0E0FF' }}>{children}</code>
              </pre>
            ) : (
              <code style={{ background: '#16213E', padding: '2px 6px', borderRadius: 4, color: '#8B5CF6', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                {children}
              </code>
            );
          },
          ul: ({ children }) => (
            <ul style={{ paddingLeft: 20, marginBottom: 12, color: '#A0A0C0' }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{ paddingLeft: 20, marginBottom: 12, color: '#A0A0C0' }}>{children}</ol>
          ),
          li: ({ children }) => (
            <li style={{ marginBottom: 4 }}>{children}</li>
          ),
          strong: ({ children }) => (
            <strong style={{ color: '#F0F0FF', fontWeight: 600 }}>{children}</strong>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#8B5CF6', textDecoration: 'underline' }}>{children}</a>
          ),
          blockquote: ({ children }) => (
            <blockquote style={{ borderLeft: '3px solid #6C3BFF', paddingLeft: 14, margin: '12px 0', color: '#8B8BAD', fontStyle: 'italic' }}>{children}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
