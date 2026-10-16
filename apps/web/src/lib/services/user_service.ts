import prisma from "@rosp/db";
import { getUserGamificationStats } from "./xp_service";

export interface WeakWordItem {
  id: string;
  userWordId: string;
  word: string;
  meaning: string;
  cefrLevel?: string | null;
  interval?: number | null;
  easeFactor?: number | null;
  lastRating?: number | null;
}

export interface RecommendedWordItem {
  id: string;
  word: string;
  meaning: string;
  example?: string | null;
  cefrLevel?: string | null;
  partOfSpeech?: string | null;
}

export interface DashboardStats {
  wordsDueToday: number;
  totalWords: number;
  wordsLearned: number;
  reviewsCompletedToday: number;
  dailyGoal: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  retentionRate: number;
  weakWords: WeakWordItem[];
  recommendedWords: RecommendedWordItem[];
}

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
    },
  });
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const now = new Date();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    wordsDueToday,
    totalWords,
    wordsLearned,
    reviewsCompletedToday,
    totalReviews,
    goodReviews,
    reviewDates,
    weakUserWords,
    userWordVocabRecords,
  ] = await Promise.all([
    // Words due for review
    prisma.userWord.count({
      where: {
        userId,
        learningState: {
          OR: [
            { nextReviewAt: { lte: now } },
            { nextReviewAt: null },
          ],
        },
      },
    }),
    // Total words in user collection
    prisma.userWord.count({
      where: { userId },
    }),
    // Words considered learned (repetitions >= 3 or interval >= 7 days)
    prisma.userWord.count({
      where: {
        userId,
        learningState: {
          OR: [
            { repetitions: { gte: 3 } },
            { interval: { gte: 7.0 } },
          ],
        },
      },
    }),
    // Reviews finished today
    prisma.reviewAttempt.count({
      where: {
        userId,
        reviewedAt: { gte: startOfDay },
      },
    }),
    // Total reviews ever
    prisma.reviewAttempt.count({
      where: { userId },
    }),
    // Good/Easy reviews (rating >= 3)
    prisma.reviewAttempt.count({
      where: {
        userId,
        rating: { gte: 3 },
      },
    }),
    // Review timestamps for streak calculation
    prisma.reviewAttempt.findMany({
      where: { userId },
      select: { reviewedAt: true },
      orderBy: { reviewedAt: "desc" },
      take: 365,
    }),
    // Weak words (lowest easeFactor / low interval)
    prisma.userWord.findMany({
      where: {
        userId,
        learningState: { isNot: null },
      },
      include: {
        vocabularyWord: true,
        learningState: true,
        reviewAttempts: {
          orderBy: { reviewedAt: "desc" },
          take: 1,
        },
      },
      orderBy: [
        { learningState: { easeFactor: "asc" } },
        { learningState: { interval: "asc" } },
      ],
      take: 5,
    }),
    // Existing word IDs for exclusion in recommended
    prisma.userWord.findMany({
      where: { userId },
      select: { vocabularyWordId: true },
    }),
  ]);

  // Server-side deterministic Gamification, XP & Streak calculation
  const gamification = await getUserGamificationStats(userId);

  // Retention rate
  const retentionRate =
    totalReviews > 0 ? Math.round((goodReviews / totalReviews) * 100) : 100;

  // Format weak words
  const weakWords: WeakWordItem[] = weakUserWords.map((uw) => ({
    id: uw.vocabularyWord.id,
    userWordId: uw.id,
    word: uw.vocabularyWord.word,
    meaning: uw.vocabularyWord.meaning,
    cefrLevel: uw.vocabularyWord.cefrLevel,
    interval: uw.learningState?.interval ?? null,
    easeFactor: uw.learningState?.easeFactor ?? null,
    lastRating: uw.reviewAttempts[0]?.rating ?? null,
  }));

  // Recommended words
  const excludedIds = userWordVocabRecords.map((u) => u.vocabularyWordId);
  let recommendedVocab = await prisma.vocabularyWord.findMany({
    where: {
      id: { notIn: excludedIds },
    },
    take: 6,
    orderBy: { frequencyRank: "asc" },
  });

  if (recommendedVocab.length === 0) {
    recommendedVocab = await prisma.vocabularyWord.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
    });
  }

  const recommendedWords: RecommendedWordItem[] = recommendedVocab.map((w) => ({
    id: w.id,
    word: w.word,
    meaning: w.meaning,
    example: w.example,
    cefrLevel: w.cefrLevel,
    partOfSpeech: w.partOfSpeech,
  }));

  return {
    wordsDueToday,
    totalWords,
    wordsLearned,
    reviewsCompletedToday,
    dailyGoal: gamification.dailyGoal,
    currentStreak: gamification.currentStreak,
    longestStreak: gamification.longestStreak,
    xp: gamification.totalXp,
    level: gamification.level,
    xpInCurrentLevel: gamification.xpInCurrentLevel,
    xpNeededForNextLevel: gamification.xpNeededForNextLevel,
    retentionRate,
    weakWords,
    recommendedWords,
  };
}

export async function addWordToStudy(userId: string, vocabularyWordId: string) {
  // Find or create default study list
  let defaultList = await prisma.wordList.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  if (!defaultList) {
    defaultList = await prisma.wordList.create({
      data: {
        userId,
        name: "My Core Vocabulary",
        description: "Primary vocabulary collection",
      },
    });
  }

  // Link to list
  await prisma.wordListItem.upsert({
    where: {
      wordListId_vocabularyWordId: {
        wordListId: defaultList.id,
        vocabularyWordId,
      },
    },
    update: {},
    create: {
      wordListId: defaultList.id,
      vocabularyWordId,
    },
  });

  // Create userWord and learning state due immediately
  const userWord = await prisma.userWord.upsert({
    where: {
      userId_vocabularyWordId: {
        userId,
        vocabularyWordId,
      },
    },
    update: {},
    create: {
      userId,
      vocabularyWordId,
    },
  });

  await prisma.learningState.upsert({
    where: { userWordId: userWord.id },
    update: {},
    create: {
      userWordId: userWord.id,
      algorithm: "SM2",
      repetitions: 0,
      interval: 1.0,
      easeFactor: 2.5,
      nextReviewAt: new Date(),
    },
  });

  return { success: true, userWordId: userWord.id };
}
