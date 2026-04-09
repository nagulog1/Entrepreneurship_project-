import type { Metadata } from 'next';
import '../styles/globals.css';
import Header from '@/components/shared/Header';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'Uni-O — Hackathon & Skill Platform',
  description:
    'Find hackathons, build skills with coding challenges, and form teams — all in one place for Indian college students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main
            style={{
              maxWidth: 1280,
              margin: '0 auto',
              padding: '24px 24px 60px',
              minHeight: 'calc(100vh - 60px)',
            }}
          >
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
