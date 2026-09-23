import prisma from "@rosp/db";

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

export async function getDashboardStats(userId: string) {
  const now = new Date();

  const [wordsDueToday, totalWords, wordsLearned] = await Promise.all([
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
    // Words considered learned (e.g. interval >= 7 days or repetitions >= 3)
    prisma.userWord.count({
      where: {
        userId,
        learningState: {
          repetitions: { gte: 3 },
        },
      },
    }),
  ]);

  return {
    wordsDueToday,
    currentStreak: 0, // Placeholder for Phase 1
    wordsLearned,
    totalWords,
  };
}
