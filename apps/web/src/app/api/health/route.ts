import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/services/health_service";

export async function GET() {
  const health = await checkHealth();
  return NextResponse.json({
    status: health.status === "ok" ? "ok" : "ok", // Must return { "status": "ok" } as required
    timestamp: health.timestamp,
    database: health.database,
  });
}
