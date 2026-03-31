"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/stores/useAppStore";

const NAV_ITEMS = [
  { href: "/", label: "🏠 Home" },
  { href: "/events", label: "🚀 Events" },
  { href: "/challenges", label: "⚡ Practice" },
  { href: "/teams", label: "🤝 Teams" },
  { href: "/leaderboard", label: "🏆 Ranks" },
];

export default function Header() {
  const pathname = usePathname();
  const xp = useAppStore((s) => s.xp);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      style={{
        background: "#0F0F1A",
        borderBottom: "1px solid #1E1E35",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        gap: 24,
        height: 60,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <div
          style={{
            width: 32,
            height: 32,
            background: "linear-gradient(135deg, #6C3BFF, #10B981)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          ⚡
        </div>
        <span
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: 20,
            background: "linear-gradient(135deg, #6C3BFF, #10B981)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Uni-O
        </span>
      </Link>

      {/* Nav */}
      <nav style={{ display: "flex", gap: 4, flex: 1 }}>
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`nav-item ${isActive(href) ? "active" : ""}`}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 500,
              transition: "all 0.2s",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              color: isActive(href) ? "#F0F0FF" : "#8B8BAD",
              background: isActive(href) ? "#6C3BFF22" : "transparent",
              border: isActive(href) ? "1px solid #6C3BFF44" : "1px solid transparent",
            }}
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            background: "#6C3BFF22",
            border: "1px solid #6C3BFF44",
            borderRadius: 20,
            padding: "4px 12px",
            fontSize: 13,
            color: "#8B5CF6",
            fontWeight: 600,
          }}
        >
          ⚡ {xp} XP
        </div>
        <Link
          href="/profile"
          className="btn-ghost"
          style={{
            padding: "6px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            background: "transparent",
            color: "#8B8BAD",
            border: "1px solid #2D2D50",
            borderRadius: 6,
            fontSize: 13,
            transition: "all 0.2s",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #6C3BFF, #8B5CF6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            You
          </div>
          Profile
        </Link>
      </div>
    </header>
  );
}
