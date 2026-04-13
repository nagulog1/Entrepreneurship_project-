"use client";

import React, { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

// ── InputField ───────────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  required?: boolean;
}

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, type = "text", placeholder, value, onChange, error, required }, ref) => (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#A0A0C0", marginBottom: 6 }}>
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          background: "#16213E",
          border: `1px solid ${error ? "#EF4444" : "#2D2D50"}`,
          borderRadius: 8,
          color: "#F0F0FF",
          fontSize: 14,
          outline: "none",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
        onFocus={(e) => { e.target.style.borderColor = "#6C3BFF"; }}
        onBlur={(e)  => { e.target.style.borderColor = error ? "#EF4444" : "#2D2D50"; }}
      />
      {error && (
        <div style={{ color: "#EF4444", fontSize: 12, marginTop: 4 }}>{error}</div>
      )}
    </div>
  )
);

// ── AuthModal ─────────────────────────────────────────────────────────────────

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithGoogle, signInWithGithub, signInWithEmail, signUpWithEmail } =
    useAuthContext();

  const [mode, setMode]         = useState<"signin" | "signup">("signin");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const reset = () => {
    setName(""); setEmail(""); setPassword(""); setConfirm("");
    setError(""); setErrors({}); setLoading(false);
  };

  const switchMode = (m: "signin" | "signup") => { setMode(m); reset(); };

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const errs: Record<string, string> = {};

    if (mode === "signup" && !name.trim()) {
      errs.name = "Full name is required";
    }
    if (!email.trim()) {
      errs.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Please enter a valid email address";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }
    if (mode === "signup" && password !== confirm) {
      errs.confirm = "Passwords do not match";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim());
      }
      reset();
      onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      if (code === "auth/user-not-found" || code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Sign in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (code === "auth/internal-error" || code === "auth/invalid-api-key") {
        setError("Firebase is not configured yet. Add credentials to .env.local.");
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google / GitHub ─────────────────────────────────────────────────────────

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithGoogle();
      reset(); onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User closed popup — not an error
      } else if (code === "auth/invalid-api-key" || code === "auth/internal-error") {
        setError("Firebase is not configured. Add your Firebase credentials to .env.local.");
      } else {
        setError("Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGithub = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithGithub();
      reset(); onClose();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        // User closed popup — not an error
      } else if (code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email. Try signing in with Google or email.");
      } else {
        setError("GitHub sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#16213E", borderRadius: 20, padding: 32,
          width: "100%", maxWidth: 420,
          border: "1px solid #2D2D50", position: "relative",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "none", border: "none", color: "#8B8BAD",
            fontSize: 22, cursor: "pointer", lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Logo + Title */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #6C3BFF, #8B5CF6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 16px",
          }}>
            ⚡
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#F0F0FF", marginBottom: 4 }}>
            {mode === "signin" ? "Welcome back" : "Join Uni-O"}
          </h2>
          <p style={{ color: "#8B8BAD", fontSize: 14 }}>
            {mode === "signin" ? "Sign in to continue your journey" : "Create your account to get started"}
          </p>
        </div>

        {/* Global error */}
        {error && (
          <div style={{
            background: "#1A0A0A", border: "1px solid #3B1010",
            borderRadius: 8, padding: "10px 14px", marginBottom: 16,
            color: "#EF4444", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* OAuth buttons */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", padding: "11px", marginBottom: 10,
            background: "#16213E", border: "1px solid #2D2D50",
            borderRadius: 10, color: "#F0F0FF", fontSize: 14,
            cursor: loading ? "default" : "pointer", fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleGithub}
          disabled={loading}
          style={{
            width: "100%", padding: "11px", marginBottom: 20,
            background: "#16213E", border: "1px solid #2D2D50",
            borderRadius: 10, color: "#F0F0FF", fontSize: 14,
            cursor: loading ? "default" : "pointer", fontWeight: 500,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <svg width="18" height="18" fill="#F0F0FF" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#2D2D50" }} />
          <span style={{ color: "#5A5A80", fontSize: 12 }}>or with email</span>
          <div style={{ flex: 1, height: 1, background: "#2D2D50" }} />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} noValidate>
          {mode === "signup" && (
            <InputField
              label="Full name"
              placeholder="Your full name"
              value={name}
              onChange={(v) => { setName(v); setErrors(prev => ({...prev, name: ""})) }}
              error={errors.name}
            />
          )}

          <InputField
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(v) => { setEmail(v); setErrors(prev => ({...prev, email: ""})) }}
            error={errors.email}
          />

          <InputField
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(v) => { setPassword(v); setErrors(prev => ({...prev, password: ""})) }}
            error={errors.password}
          />

          {mode === "signup" && (
            <InputField
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(v) => { setConfirm(v); setErrors(prev => ({...prev, confirm: ""})) }}
              error={errors.confirm}
            />
          )}

          {mode === "signin" && (
            <div style={{ textAlign: "right", marginBottom: 16, marginTop: -8 }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#8B5CF6", fontSize: 13, cursor: "pointer" }}
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              background: loading ? "#3D2D8A" : "linear-gradient(135deg, #6C3BFF, #8B5CF6)",
              border: "none", borderRadius: 10,
              color: "#fff", fontSize: 15, fontWeight: 600,
              cursor: loading ? "default" : "pointer", marginBottom: 16,
            }}
          >
            {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {mode === "signup" && (
          <p style={{ color: "#8B8BAD", fontSize: 12, textAlign: "center", marginBottom: 16 }}>
            A verification email will be sent to your inbox.
          </p>
        )}

        {/* Switch mode */}
        <p style={{ textAlign: "center", color: "#8B8BAD", fontSize: 14 }}>
          {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
            style={{ background: "none", border: "none", color: "#8B5CF6", fontSize: 14, cursor: "pointer", fontWeight: 600 }}
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}