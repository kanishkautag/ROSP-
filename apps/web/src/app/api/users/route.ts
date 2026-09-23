import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getDashboardStats, getUserProfile } from "@/lib/services/user_service";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [profile, stats] = await Promise.all([
      getUserProfile(user.id),
      getDashboardStats(user.id),
    ]);

    return NextResponse.json({
      user: profile,
      stats,
    });
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
