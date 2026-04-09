'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthContext } from '@/contexts/AuthContext';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const signInSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const resetSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type SignInData = z.infer<typeof signInSchema>;
type SignUpData = z.infer<typeof signUpSchema>;
type ResetData = z.infer<typeof resetSchema>;
type View = 'signin' | 'signup' | 'reset';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>{msg}</p>;
}

function InputField({
  label,
  type = 'text',
  placeholder,
  error,
  ...rest
}: {
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#A0A0C0', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: '#0F0F1A',
          border: `1px solid ${error ? '#EF4444' : '#2D2D50'}`,
          borderRadius: 8,
          padding: '10px 14px',
          color: '#F0F0FF',
          fontSize: 14,
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        {...rest}
      />
      <FieldError msg={error} />
    </div>
  );
}

function OAuthButton({
  onClick,
  loading,
  children,
  icon,
}: {
  onClick: () => void;
  loading: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        background: '#16213E',
        border: '1px solid #2D2D50',
        borderRadius: 8,
        padding: '10px 14px',
        color: '#F0F0FF',
        fontSize: 14,
        fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        fontFamily: 'inherit',
        transition: 'all 0.2s',
        marginBottom: 10,
      }}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <div
      style={{
        width: 16,
        height: 16,
        border: '2px solid #2D2D50',
        borderTopColor: '#6C3BFF',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const GithubIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#F0F0FF">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub, resetPassword } =
    useAuthContext();

  const [view, setView] = useState<View>('signin');
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [globalError, setGlobalError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // ── Sign In form ────────────────────────────────────────────────────────────
  const signInForm = useForm<SignInData>({ resolver: zodResolver(signInSchema) });
  const signUpForm = useForm<SignUpData>({ resolver: zodResolver(signUpSchema) });
  const resetForm = useForm<ResetData>({ resolver: zodResolver(resetSchema) });

  if (!isOpen) return null;

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSignIn = async (data: SignInData) => {
    setGlobalError('');
    try {
      await signInWithEmail(data.email, data.password);
      onClose();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Sign in failed');
    }
  };

  const handleSignUp = async (data: SignUpData) => {
    setGlobalError('');
    try {
      await signUpWithEmail(data.email, data.password, data.displayName);
      onClose();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Sign up failed');
    }
  };

  const handleReset = async (data: ResetData) => {
    setGlobalError('');
    try {
      await resetPassword(data.email);
      setResetSent(true);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  const handleGoogle = async () => {
    setOauthLoading('google');
    setGlobalError('');
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setOauthLoading(null);
    }
  };

  const handleGithub = async () => {
    setOauthLoading('github');
    setGlobalError('');
    try {
      await signInWithGithub();
      onClose();
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'GitHub sign in failed');
    } finally {
      setOauthLoading(null);
    }
  };

  const switchView = (v: View) => {
    setView(v);
    setGlobalError('');
    setResetSent(false);
  };

  return (
    <div
      onClick={handleBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#1E1E35',
          border: '1px solid #2D2D50',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 420,
          position: 'relative',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: '#8B8BAD',
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ✕
        </button>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'linear-gradient(135deg,#6C3BFF,#8B5CF6)',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              margin: '0 auto 12px',
            }}
          >
            ⚡
          </div>
          <h2
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: '#F0F0FF',
              marginBottom: 4,
            }}
          >
            {view === 'signin' ? 'Welcome back' : view === 'signup' ? 'Join Uni-O' : 'Reset password'}
          </h2>
          <p style={{ color: '#8B8BAD', fontSize: 13 }}>
            {view === 'signin'
              ? 'Sign in to continue your journey'
              : view === 'signup'
              ? 'Create your account to get started'
              : 'Enter your email to receive a reset link'}
          </p>
        </div>

        {/* Global error */}
        {globalError && (
          <div
            style={{
              background: '#EF444422',
              border: '1px solid #EF444444',
              borderRadius: 8,
              padding: '10px 14px',
              color: '#EF4444',
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {globalError}
          </div>
        )}

        {/* ── Reset View ── */}
        {view === 'reset' && (
          <>
            {resetSent ? (
              <div
                style={{
                  background: '#10B98122',
                  border: '1px solid #10B98144',
                  borderRadius: 8,
                  padding: '14px',
                  color: '#10B981',
                  fontSize: 14,
                  textAlign: 'center',
                  marginBottom: 20,
                }}
              >
                ✓ Reset link sent! Check your inbox.
              </div>
            ) : (
              <form onSubmit={resetForm.handleSubmit(handleReset)}>
                <InputField
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  error={resetForm.formState.errors.email?.message}
                  {...resetForm.register('email')}
                />
                <button
                  type="submit"
                  disabled={resetForm.formState.isSubmitting}
                  className="btn-primary"
                  style={{ width: '100%', padding: '11px', marginBottom: 16 }}
                >
                  {resetForm.formState.isSubmitting ? <Spinner /> : 'Send Reset Link'}
                </button>
              </form>
            )}
            <p style={{ textAlign: 'center', fontSize: 13, color: '#8B8BAD' }}>
              Remember it?{' '}
              <button
                onClick={() => switchView('signin')}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontSize: 13 }}
              >
                Sign in
              </button>
            </p>
          </>
        )}

        {/* ── Sign In View ── */}
        {view === 'signin' && (
          <>
            <OAuthButton onClick={handleGoogle} loading={oauthLoading === 'google'} icon={<GoogleIcon />}>
              Continue with Google
            </OAuthButton>
            <OAuthButton onClick={handleGithub} loading={oauthLoading === 'github'} icon={<GithubIcon />}>
              Continue with GitHub
            </OAuthButton>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#2D2D50' }} />
              <span style={{ color: '#5A5A80', fontSize: 12 }}>or with email</span>
              <div style={{ flex: 1, height: 1, background: '#2D2D50' }} />
            </div>

            <form onSubmit={signInForm.handleSubmit(handleSignIn)}>
              <InputField
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={signInForm.formState.errors.email?.message}
                {...signInForm.register('email')}
              />
              <InputField
                label="Password"
                type="password"
                placeholder="••••••••"
                error={signInForm.formState.errors.password?.message}
                {...signInForm.register('password')}
              />

              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => switchView('reset')}
                  style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontSize: 12 }}
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={signInForm.formState.isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '11px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {signInForm.formState.isSubmitting ? <Spinner /> : 'Sign In'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#8B8BAD' }}>
              Don&apos;t have an account?{' '}
              <button
                onClick={() => switchView('signup')}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Sign up
              </button>
            </p>
          </>
        )}

        {/* ── Sign Up View ── */}
        {view === 'signup' && (
          <>
            <OAuthButton onClick={handleGoogle} loading={oauthLoading === 'google'} icon={<GoogleIcon />}>
              Continue with Google
            </OAuthButton>
            <OAuthButton onClick={handleGithub} loading={oauthLoading === 'github'} icon={<GithubIcon />}>
              Continue with GitHub
            </OAuthButton>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: '#2D2D50' }} />
              <span style={{ color: '#5A5A80', fontSize: 12 }}>or with email</span>
              <div style={{ flex: 1, height: 1, background: '#2D2D50' }} />
            </div>

            <form onSubmit={signUpForm.handleSubmit(handleSignUp)}>
              <InputField
                label="Full name"
                placeholder="Alex Johnson"
                error={signUpForm.formState.errors.displayName?.message}
                {...signUpForm.register('displayName')}
              />
              <InputField
                label="Email address"
                type="email"
                placeholder="you@example.com"
                error={signUpForm.formState.errors.email?.message}
                {...signUpForm.register('email')}
              />
              <InputField
                label="Password"
                type="password"
                placeholder="Min. 6 characters"
                error={signUpForm.formState.errors.password?.message}
                {...signUpForm.register('password')}
              />
              <InputField
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                error={signUpForm.formState.errors.confirmPassword?.message}
                {...signUpForm.register('confirmPassword')}
              />

              <button
                type="submit"
                disabled={signUpForm.formState.isSubmitting}
                className="btn-primary"
                style={{ width: '100%', padding: '11px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {signUpForm.formState.isSubmitting ? <Spinner /> : 'Create Account'}
              </button>
            </form>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#5A5A80', marginBottom: 12 }}>
              A verification email will be sent to your inbox.
            </p>

            <p style={{ textAlign: 'center', fontSize: 13, color: '#8B8BAD' }}>
              Already have an account?{' '}
              <button
                onClick={() => switchView('signin')}
                style={{ background: 'none', border: 'none', color: '#8B5CF6', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
