/**
 * SubscriptionModal.tsx — Full payment flow with Razorpay checkout.
 * Handles plan selection, order creation, payment, and post-payment state.
 */

"use client";

import { useState } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { PLANS, formatINR, type PlanKey } from "@/lib/payments/paymentService";

// Extend window for Razorpay SDK
declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void;
      on(event: string, handler: (response: unknown) => void): void;
    };
  }
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

async function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.Razorpay) return true;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { user } = useAuthContext();
  const { showNotif } = useAppStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("pro_monthly");
  const [step, setStep] = useState<"select" | "processing" | "success" | "error">("select");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const plan = PLANS[selectedPlan];

  const handleSubscribe = async () => {
    if (!user) {
      showNotif("Please sign in to subscribe.", "error");
      return;
    }

    setStep("processing");

    try {
      // 1. Load Razorpay SDK
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway. Please check your connection.");

      // 2. Create order/subscription on server
      const idToken = await user.getIdToken();
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ planKey: selectedPlan, type: "subscription" }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error || "Failed to initialize payment.");
      }

      const { config } = await res.json() as {
        config: Record<string, unknown>;
        subscriptionId: string;
      };

      // 3. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          ...config,
          handler: async (response: unknown) => {
            const r = response as {
              razorpay_payment_id: string;
              razorpay_subscription_id?: string;
              razorpay_signature: string;
            };

            // 4. Verify payment on server
            try {
              const verifyRes = await fetch("/api/payments/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  paymentId: r.razorpay_payment_id,
                  subscriptionId: r.razorpay_subscription_id,
                  signature: r.razorpay_signature,
                }),
              });

              if (!verifyRes.ok) throw new Error("Payment verification failed.");
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("PAYMENT_CANCELLED"));
            },
          },
          theme: { color: "#6C3BFF" },
          prefill: {
            name: user.displayName || "",
            email: user.email || "",
          },
        });

        rzp.on("payment.failed", (response: unknown) => {
          const r = response as { error: { description: string } };
          reject(new Error(r.error?.description || "Payment failed."));
        });

        rzp.open();
      });

      setStep("success");
      showNotif("🎉 Pro subscription activated! Welcome to Uni-O Pro.", "success");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An error occurred.";
      if (msg === "PAYMENT_CANCELLED") {
        setStep("select");
        return;
      }
      setErrorMsg(msg);
      setStep("error");
    }
  };

  const savings = Math.round(
    ((PLANS.pro_monthly.amount * 12 - PLANS.pro_annual.amount) / (PLANS.pro_monthly.amount * 12)) * 100
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#16213E",
          borderRadius: 20,
          padding: 32,
          width: "100%",
          maxWidth: 480,
          border: "1px solid #2D2D50",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "none",
            border: "none",
            color: "#8B8BAD",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          ×
        </button>

        {/* ── Step: Select Plan ── */}
        {step === "select" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚡</div>
              <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: "#F0F0FF" }}>
                Upgrade to Uni-O Pro
              </h2>
              <p style={{ color: "#8B8BAD", marginTop: 6, fontSize: 14 }}>
                Unlock premium features and accelerate your growth
              </p>
            </div>

            {/* Plan Selector */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              {(["pro_monthly", "pro_annual"] as PlanKey[]).map((key) => {
                const p = PLANS[key];
                const isSelected = selectedPlan === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    style={{
                      flex: 1,
                      padding: 16,
                      background: isSelected ? "#6C3BFF22" : "#0D0D1A",
                      border: `2px solid ${isSelected ? "#6C3BFF" : "#2D2D50"}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      position: "relative",
                    }}
                  >
                    {key === "pro_annual" && (
                      <div
                        style={{
                          position: "absolute",
                          top: -10,
                          right: 10,
                          background: "#10B981",
                          color: "#fff",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        SAVE {savings}%
                      </div>
                    )}
                    <div style={{ fontWeight: 700, color: "#F0F0FF", fontSize: 15, marginBottom: 4 }}>
                      {key === "pro_monthly" ? "Monthly" : "Annual"}
                    </div>
                    <div style={{ color: "#8B5CF6", fontWeight: 700, fontSize: 18 }}>
                      {formatINR(p.amount)}
                    </div>
                    <div style={{ color: "#8B8BAD", fontSize: 11 }}>
                      {key === "pro_monthly" ? "/month" : "/year"}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Features */}
            <div style={{ marginBottom: 24 }}>
              {plan.features.map((f) => (
                <div
                  key={f}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    fontSize: 13,
                    color: "#A0A0C0",
                  }}
                >
                  <span style={{ color: "#10B981", fontWeight: 700 }}>✓</span>
                  {f}
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              style={{ width: "100%", padding: "14px", fontSize: 15 }}
              onClick={handleSubscribe}
            >
              Subscribe — {formatINR(plan.amount)}{selectedPlan === "pro_monthly" ? "/mo" : "/yr"}
            </button>

            <p style={{ color: "#5A5A80", fontSize: 11, textAlign: "center", marginTop: 12 }}>
              Secure payment via Razorpay · Cancel anytime · 7-day money-back guarantee
            </p>
          </>
        )}

        {/* ── Step: Processing ── */}
        {step === "processing" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: 48,
                height: 48,
                border: "3px solid #6C3BFF",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 20px",
              }}
            />
            <p style={{ color: "#8B8BAD" }}>Opening payment gateway…</p>
          </div>
        )}

        {/* ── Step: Success ── */}
        {step === "success" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#10B981" }}>
              You're now Pro!
            </h2>
            <p style={{ color: "#8B8BAD", marginTop: 8, marginBottom: 24 }}>
              A confirmation email has been sent. Enjoy all premium features!
            </p>
            <button className="btn-primary" style={{ width: "100%" }} onClick={onClose}>
              Start Exploring →
            </button>
          </div>
        )}

        {/* ── Step: Error ── */}
        {step === "error" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#EF4444" }}>
              Payment Failed
            </h2>
            <p style={{ color: "#8B8BAD", marginTop: 8, marginBottom: 24, fontSize: 14 }}>
              {errorMsg || "Something went wrong. Please try again."}
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => { setStep("select"); setErrorMsg(""); }}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}