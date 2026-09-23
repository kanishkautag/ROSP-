import prisma from "@rosp/db";

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  database: "connected" | "disconnected";
  timestamp: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  let dbStatus: "connected" | "disconnected" = "disconnected";
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "connected";
  } catch (error) {
    console.error("Database health check failed:", error);
  }

  return {
    status: dbStatus === "connected" ? "ok" : "degraded",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  };
}
