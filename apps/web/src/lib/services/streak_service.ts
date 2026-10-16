/**
 * Robust Streak & Timezone Service
 * Calculates user activity dates and streaks purely on the server using IANA timezones.
 * Source of truth is historical activity records, never client clock or counters.
 */

/**
 * Returns YYYY-MM-DD for a given Date in the target IANA timezone (defaults to Asia/Kolkata).
 */
export function getActivityDate(date: Date = new Date(), timeZone: string = "Asia/Kolkata"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    // Fallback if invalid timezone string provided
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  }
}

/**
 * Returns previous calendar date (YYYY-MM-DD) for a given date string.
 */
export function getPreviousDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Returns next calendar date (YYYY-MM-DD) for a given date string.
 */
export function getNextDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes currentStreak and longestStreak from a collection of active activity dates.
 * A day qualifies when at least one valid review attempt was saved.
 *
 * Rules:
 * - If user studied today: count consecutive active dates backwards from today.
 * - If user has not studied today but studied yesterday: preserve streak during today.
 * - If user has not studied today or yesterday: active streak is 0.
 * - Longest streak is the maximum consecutive active run across all historical activity.
 */
export function calculateStreaks(
  activeDatesInput: string[],
  todayStr: string
): { currentStreak: number; longestStreak: number } {
  if (!activeDatesInput || activeDatesInput.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dateSet = new Set(activeDatesInput);
  const yesterdayStr = getPreviousDate(todayStr);

  // 1. Current streak calculation
  let currentStreak = 0;
  if (dateSet.has(todayStr)) {
    currentStreak = 1;
    let checkDate = yesterdayStr;
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDate(checkDate);
    }
  } else if (dateSet.has(yesterdayStr)) {
    currentStreak = 1;
    let checkDate = getPreviousDate(yesterdayStr);
    while (dateSet.has(checkDate)) {
      currentStreak++;
      checkDate = getPreviousDate(checkDate);
    }
  } else {
    currentStreak = 0;
  }

  // 2. Longest streak calculation across all unique sorted dates
  const sortedDates = Array.from(dateSet).sort();
  let longestStreak = 0;
  let currentRun = 0;
  let prevDate: string | null = null;

  for (const date of sortedDates) {
    if (!prevDate) {
      currentRun = 1;
    } else {
      const expectedNext = getNextDate(prevDate);
      if (date === expectedNext) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevDate = date;
  }

  // Longest streak is at least current streak
  longestStreak = Math.max(longestStreak, currentStreak);

  return { currentStreak, longestStreak };
}

/**
 * Calculates user level and progress from total XP.
 * Deterministic: level = Math.floor(totalXp / 100) + 1
 */
export function calculateLevel(totalXp: number): {
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
} {
  const safeXp = Math.max(0, totalXp);
  const level = Math.floor(safeXp / 100) + 1;
  const xpInCurrentLevel = safeXp % 100;
  const xpNeededForNextLevel = 100;

  return { level, xpInCurrentLevel, xpNeededForNextLevel };
}
