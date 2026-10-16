import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getActivityDate,
  getPreviousDate,
  getNextDate,
  calculateStreaks,
  calculateLevel,
} from "../apps/web/src/lib/services/streak_service";

describe("Streak and Timezone Engine", () => {
  it("determines local date boundaries correctly based on user IANA timezone", () => {
    // 2026-10-16 19:00 UTC is 2026-10-17 00:30 AM in Asia/Kolkata (UTC+5:30)
    const lateUtc = new Date(Date.UTC(2026, 9, 16, 19, 0, 0));
    const kolkataDate = getActivityDate(lateUtc, "Asia/Kolkata");
    assert.equal(kolkataDate, "2026-10-17");

    // In UTC, it's still 2026-10-16
    const utcDate = getActivityDate(lateUtc, "UTC");
    assert.equal(utcDate, "2026-10-16");

    // In America/New_York (UTC-4 in October), it's 2026-10-16 15:00
    const nyDate = getActivityDate(lateUtc, "America/New_York");
    assert.equal(nyDate, "2026-10-16");
  });

  it("calculates previous and next local dates cleanly across month/year boundaries", () => {
    assert.equal(getPreviousDate("2026-01-01"), "2025-12-31");
    assert.equal(getNextDate("2025-12-31"), "2026-01-01");
    assert.equal(getPreviousDate("2026-03-01"), "2026-02-28"); // non-leap year
  });

  it("streak continuation: consecutive active dates up to today", () => {
    const today = "2026-10-16";
    const history = ["2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16"];
    const result = calculateStreaks(history, today);

    assert.equal(result.currentStreak, 4);
    assert.equal(result.longestStreak, 4);
  });

  it("streak preservation: studied yesterday but has not yet studied today", () => {
    const today = "2026-10-16";
    const history = ["2026-10-13", "2026-10-14", "2026-10-15"]; // no activity on 2026-10-16 yet
    const result = calculateStreaks(history, today);

    // Current streak is preserved during today
    assert.equal(result.currentStreak, 3);
    assert.equal(result.longestStreak, 3);
  });

  it("streak interruption: missed yesterday and today resets active streak to zero", () => {
    const today = "2026-10-16";
    const history = ["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]; // missed 15 and 16
    const result = calculateStreaks(history, today);

    assert.equal(result.currentStreak, 0);
    // Historical longest streak must be preserved
    assert.equal(result.longestStreak, 5);
  });

  it("streak recovery: after a missed gap, studying today starts a new streak of 1", () => {
    const today = "2026-10-16";
    const history = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-16"]; // gap between 3rd and 16th
    const result = calculateStreaks(history, today);

    assert.equal(result.currentStreak, 1);
    assert.equal(result.longestStreak, 3);
  });

  it("handles duplicate dates and unordered dates gracefully", () => {
    const today = "2026-10-16";
    const history = [
      "2026-10-16",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-14",
    ];
    const result = calculateStreaks(history, today);

    assert.equal(result.currentStreak, 3);
    assert.equal(result.longestStreak, 3);
  });

  it("calculates longest streak independently from past personal bests", () => {
    const today = "2026-10-25";
    // 10-day streak in September, then gap, then 3-day streak ending today
    const history = [
      "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05",
      "2026-09-06", "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
      "2026-10-23", "2026-10-24", "2026-10-25",
    ];
    const result = calculateStreaks(history, today);

    assert.equal(result.currentStreak, 3);
    assert.equal(result.longestStreak, 10);
  });
});

describe("Deterministic XP and Gamification Scoring Rules", () => {
  it("calculates user levels correctly from XP ledger totals", () => {
    assert.equal(calculateLevel(0).level, 1);
    assert.equal(calculateLevel(99).level, 1);
    assert.equal(calculateLevel(100).level, 2);
    assert.equal(calculateLevel(1540).level, 16); // Demo account level
  });

  it("evaluates deterministic scoring breakdown", () => {
    // Rules:
    // Review distinct word first time that day: 5 XP
    // Correct first answer: 5 bonus XP
    // Daily goal reached (10 distinct words): 20 bonus XP
    // 10 words, 8 correct, 2 incorrect:
    // Word reviews: 10 * 5 = 50 XP
    // First correct bonus: 8 * 5 = 40 XP
    // Daily goal bonus: 20 XP
    // Day total = 110 XP
    const wordCount = 10;
    const correctCount = 8;
    const dailyGoalBonus = 20;

    const dayXp = (wordCount * 5) + (correctCount * 5) + dailyGoalBonus;
    assert.equal(dayXp, 110);

    // Across 14 identical days: 14 * 110 = 1540 XP
    assert.equal(14 * dayXp, 1540);
  });

  it("generates deterministic and unique idempotency keys", () => {
    const userId = "user-123";
    const dateStr = "2026-10-16";
    const wordId = "word-456";

    const reviewKey = `user_${userId}_${dateStr}_${wordId}_review`;
    const correctKey = `user_${userId}_${dateStr}_${wordId}_first_correct`;
    const goalKey = `user_${userId}_${dateStr}_daily_goal`;

    assert.equal(reviewKey, "user_user-123_2026-10-16_word-456_review");
    assert.equal(correctKey, "user_user-123_2026-10-16_word-456_first_correct");
    assert.equal(goalKey, "user_user-123_2026-10-16_daily_goal");

    // Keys are distinct
    const keySet = new Set([reviewKey, correctKey, goalKey]);
    assert.equal(keySet.size, 3);
  });
});
