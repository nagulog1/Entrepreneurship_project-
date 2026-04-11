/**
 * /api/health/route.ts — Health check endpoint for load balancers and monitoring.
 */

import { NextRequest, NextResponse } from "next/server";
import { runHealthChecks } from "@/lib/monitoring/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Quick ping — return 200 immediately for load balancer health checks
  const url = new URL(request.url);
  if (url.searchParams.get("quick") === "true") {
    return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() });
  }

  // Full health check
  const health = await runHealthChecks();

  return NextResponse.json(health, {
    status: health.status === "unhealthy" ? 503 : 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Health-Status": health.status,
    },
  });
}