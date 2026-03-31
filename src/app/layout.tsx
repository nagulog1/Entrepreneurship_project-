import type { Metadata } from "next";
import Header from "@/components/shared/Header";
import Notification from "@/components/shared/Notification";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Uni-O — Hackathons. Code. Collaborate. Win.",
  description: "India's premier platform for college students — discover hackathons, sharpen your DSA skills, and build legendary teams.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ minHeight: "100vh", background: "#0A0A14", color: "#F0F0FF" }}>
        <Header />
        <Notification />
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
