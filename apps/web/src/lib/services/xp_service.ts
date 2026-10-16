import prisma from "@rosp/db";
import { getActivityDate, calculateStreaks, calculateLevel } from "./streak_service";

export interface ReviewXpResult {
  isFirstReviewToday: boolean;
  xpAwarded: number;
  dailyGoalReached: boolean;
  totalXp: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Transactionally records daily activity, evaluates first-review & accuracy bonuses,
 * checks daily goal completion, and inserts idempotent XP ledger events.
 */
export async function recordReviewActivityAndXp(
  userId: string,
  vocabularyWordId: string,
  isCorrect: boolean,
  clientAttemptDate: Date = new Date()
): Promise<ReviewXpResult> {
  // 1. Fetch user to get timezone and daily goal
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timezone: true, dailyGoal: true },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const userTimezone = user.timezone || "Asia/Kolkata";
  const activityDate = getActivityDate(clientAttemptDate, userTimezone);
  const dailyGoal = user.dailyGoal || 10;

  const reviewEventKey = `user_${userId}_${activityDate}_${vocabularyWordId}_review`;
  const correctEventKey = `user_${userId}_${activityDate}_${vocabularyWordId}_first_correct`;
  const goalEventKey = `user_${userId}_${activityDate}_daily_goal`;

  let xpAwardedThisAttempt = 0;
  let isFirstReviewToday = false;
  let dailyGoalReached = false;

  await prisma.$transaction(async (tx) => {
    // 2. Check if this word was already reviewed by this user on this local date
    const existingReviewEvent = await tx.xpEvent.findUnique({
      where: { idempotencyKey: reviewEventKey },
    });

    if (!existingReviewEvent) {
      isFirstReviewToday = true;

      // Award 5 XP for reviewing distinct word for first time that date
      await tx.xpEvent.create({
        data: {
          userId,
          amount: 5,
          reason: "WORD_REVIEW",
          idempotencyKey: reviewEventKey,
          activityDate,
          vocabularyWordId,
        },
      });
      xpAwardedThisAttempt += 5;

      // Award 5 bonus XP if first submitted answer is correct
      if (isCorrect) {
        await tx.xpEvent.create({
          data: {
            userId,
            amount: 5,
            reason: "CORRECT_BONUS",
            idempotencyKey: correctEventKey,
            activityDate,
            vocabularyWordId,
          },
        });
        xpAwardedThisAttempt += 5;
      }

      // Upsert DailyActivity
      const existingActivity = await tx.dailyActivity.findUnique({
        where: {
          userId_activityDate: {
            userId,
            activityDate,
          },
        },
      });

      const currentUniqueCount = (existingActivity?.uniqueWordsReviewed ?? 0) + 1;
      let goalCompletedAt = existingActivity?.dailyGoalCompletedAt ?? null;

      // Check if daily goal achieved today
      if (currentUniqueCount >= dailyGoal && !goalCompletedAt) {
        // Award 20 bonus XP for reaching daily goal
        const existingGoalEvent = await tx.xpEvent.findUnique({
          where: { idempotencyKey: goalEventKey },
        });

        if (!existingGoalEvent) {
          await tx.xpEvent.create({
            data: {
              userId,
              amount: 20,
              reason: "DAILY_GOAL",
              idempotencyKey: goalEventKey,
              activityDate,
              vocabularyWordId: null,
            },
          });
          xpAwardedThisAttempt += 20;
          goalCompletedAt = new Date();
          dailyGoalReached = true;
        }
      }

      const totalDayXp = (existingActivity?.xpEarned ?? 0) + xpAwardedThisAttempt;

      await tx.dailyActivity.upsert({
        where: {
          userId_activityDate: {
            userId,
            activityDate,
          },
        },
        create: {
          userId,
          activityDate,
          uniqueWordsReviewed: currentUniqueCount,
          dailyGoalCompletedAt: goalCompletedAt,
          xpEarned: totalDayXp,
        },
        update: {
          uniqueWordsReviewed: currentUniqueCount,
          dailyGoalCompletedAt: goalCompletedAt,
          xpEarned: totalDayXp,
        },
      });
    }
  });

  // 3. Compute active streak and aggregate total XP from ledger
  const [totalXpResult, allActivities] = await Promise.all([
    prisma.xpEvent.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.dailyActivity.findMany({
      where: {
        userId,
        uniqueWordsReviewed: { gt: 0 },
      },
      select: { activityDate: true },
    }),
  ]);

  const totalXp = totalXpResult._sum.amount ?? 0;
  const activeDates = allActivities.map((a) => a.activityDate);
  const { currentStreak, longestStreak } = calculateStreaks(activeDates, activityDate);

  return {
    isFirstReviewToday,
    xpAwarded: xpAwardedThisAttempt,
    dailyGoalReached,
    totalXp,
    currentStreak,
    longestStreak,
  };
}

/**
 * Returns comprehensive user gamification stats computed strictly from server state.
 */
export async function getUserGamificationStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, timezone: true, dailyGoal: true },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const userTimezone = user.timezone || "Asia/Kolkata";
  const todayStr = getActivityDate(new Date(), userTimezone);
  const dailyGoal = user.dailyGoal || 10;

  const [totalXpResult, allActivities, todayActivity] = await Promise.all([
    prisma.xpEvent.aggregate({
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.dailyActivity.findMany({
      where: {
        userId,
        uniqueWordsReviewed: { gt: 0 },
      },
      select: { activityDate: true },
    }),
    prisma.dailyActivity.findUnique({
      where: {
        userId_activityDate: {
          userId,
          activityDate: todayStr,
        },
      },
    }),
  ]);

  const totalXp = totalXpResult._sum.amount ?? 0;
  const activeDates = allActivities.map((a) => a.activityDate);
  const { currentStreak, longestStreak } = calculateStreaks(activeDates, todayStr);
  const { level, xpInCurrentLevel, xpNeededForNextLevel } = calculateLevel(totalXp);

  const uniqueWordsReviewedToday = todayActivity?.uniqueWordsReviewed ?? 0;
  const dailyGoalCompletedToday = Boolean(todayActivity?.dailyGoalCompletedAt);

  return {
    totalXp,
    level,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    currentStreak,
    longestStreak,
    dailyGoal,
    uniqueWordsReviewedToday,
    dailyGoalCompletedToday,
    userTimezone,
    todayStr,
  };
}
