import { getCurrentUser } from "@/lib/auth/auth";
import { getDashboardStats } from "@/lib/services/user_service";
import { DashboardClient } from "@/components/dashboard_client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const defaultStats = {
    wordsDueToday: 0,
    totalWords: 0,
    wordsLearned: 0,
    reviewsCompletedToday: 0,
    dailyGoal: 20,
    currentStreak: 0,
    longestStreak: 0,
    xp: 0,
    level: 1,
    xpInCurrentLevel: 0,
    xpNeededForNextLevel: 100,
    retentionRate: 100,
    weakWords: [],
    recommendedWords: [],
  };

  const stats = user
    ? await getDashboardStats(user.id).catch((err) => {
        console.error("Dashboard stats fetch error:", err);
        return defaultStats;
      })
    : defaultStats;

  return <DashboardClient userName={user?.name || user?.email} initialStats={stats} />;
}
