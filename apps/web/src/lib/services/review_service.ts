import prisma from "@rosp/db";
import { ReviewSubmissionInput } from "@rosp/shared";
import { LearningAlgorithmFactory } from "../learning/learning_algorithm_factory";
import { recordReviewActivityAndXp } from "./xp_service";

export async function getDueReviews(
  userId: string,
  limit = 20,
  language?: string,
  wordListId?: string,
  mode: "due" | "all" = "due"
) {
  const now = new Date();

  // If wordListId is provided, get vocabulary IDs from that list
  let vocabularyWordIds: string[] | undefined = undefined;
  if (wordListId) {
    const listItems = await prisma.wordListItem.findMany({
      where: { wordListId },
      select: { vocabularyWordId: true },
    });
    vocabularyWordIds = listItems.map((li) => li.vocabularyWordId);
  }

  const where: any = {
    userId,
    ...(language && language !== "ALL"
      ? {
          vocabularyWord: {
            language,
          },
        }
      : {}),
    ...(vocabularyWordIds ? { vocabularyWordId: { in: vocabularyWordIds } } : {}),
  };

  if (mode === "due") {
    where.learningState = {
      OR: [
        { nextReviewAt: { lte: now } },
        { nextReviewAt: null },
      ],
    };
  }

  const [reviews, userWords] = await Promise.all([
    prisma.userWord.findMany({
      where,
      include: {
        vocabularyWord: true,
        learningState: true,
      },
      orderBy: [
        {
          learningState: {
            nextReviewAt: "asc",
          },
        },
        {
          vocabularyWord: {
            frequencyRank: "asc",
          },
        },
        {
          createdAt: "desc",
        },
      ],
      take: limit,
    }),
    prisma.userWord.findMany({
      where: { userId },
      select: {
        vocabularyWord: { select: { language: true } },
        learningState: { select: { nextReviewAt: true } },
      },
    }),
  ]);

  const countsByLanguage: Record<string, { due: number; total: number }> = {
    ALL: { due: 0, total: userWords.length },
  };

  for (const uw of userWords) {
    const lang = uw.vocabularyWord.language || "en";
    if (!countsByLanguage[lang]) {
      countsByLanguage[lang] = { due: 0, total: 0 };
    }
    countsByLanguage[lang].total += 1;

    const isDue = !uw.learningState?.nextReviewAt || uw.learningState.nextReviewAt <= now;
    if (isDue) {
      countsByLanguage.ALL.due += 1;
      countsByLanguage[lang].due += 1;
    }
  }

  return { reviews, countsByLanguage };
}

export async function processReviewSubmission(
  userId: string,
  input: ReviewSubmissionInput
) {
  const userWord = await prisma.userWord.findUnique({
    where: { id: input.userWordId },
    include: { learningState: true },
  });

  if (!userWord || userWord.userId !== userId) {
    throw new Error("User word not found or unauthorized");
  }

  const currentState = userWord.learningState;
  const algorithm = LearningAlgorithmFactory.getAlgorithm(currentState?.algorithm);

  const scheduleResult = algorithm.schedule(
    {
      repetitions: currentState?.repetitions,
      interval: currentState?.interval,
      easeFactor: currentState?.easeFactor,
      difficulty: currentState?.difficulty,
      stability: currentState?.stability,
      retrievability: currentState?.retrievability,
      lastReviewedAt: currentState?.lastReviewedAt,
    },
    {
      rating: input.rating,
      reviewedAt: new Date(),
    }
  );

  // Append-only ReviewAttempt record
  const reviewAttempt = await prisma.reviewAttempt.create({
    data: {
      userId,
      userWordId: userWord.id,
      rating: input.rating,
      correct: input.rating >= 3,
      reviewedAt: scheduleResult.lastReviewedAt,
      previousInterval: currentState?.interval ?? 0,
      newInterval: scheduleResult.interval,
      previousEaseFactor: currentState?.easeFactor ?? 2.5,
      newEaseFactor: scheduleResult.easeFactor,
    },
  });

  // Link exercise if provided
  if (input.exerciseId) {
    try {
      await prisma.exercise.update({
        where: { id: input.exerciseId },
        data: { reviewAttemptId: reviewAttempt.id },
      });
    } catch {
      // Non-fatal if exercise not found
    }
  }

  // Record daily activity, streaks, and XP events deterministically
  const xpResult = await recordReviewActivityAndXp(
    userId,
    userWord.vocabularyWordId,
    reviewAttempt.correct,
    reviewAttempt.reviewedAt
  );

  // Update learning state
  const updatedState = await prisma.learningState.upsert({
    where: { userWordId: userWord.id },
    create: {
      userWordId: userWord.id,
      algorithm: currentState?.algorithm ?? "SM2",
      repetitions: scheduleResult.repetitions,
      interval: scheduleResult.interval,
      easeFactor: scheduleResult.easeFactor,
      difficulty: scheduleResult.difficulty,
      stability: scheduleResult.stability,
      retrievability: scheduleResult.retrievability,
      lastReviewedAt: scheduleResult.lastReviewedAt,
      nextReviewAt: scheduleResult.nextReviewAt,
    },
    update: {
      repetitions: scheduleResult.repetitions,
      interval: scheduleResult.interval,
      easeFactor: scheduleResult.easeFactor,
      difficulty: scheduleResult.difficulty,
      stability: scheduleResult.stability,
      retrievability: scheduleResult.retrievability,
      lastReviewedAt: scheduleResult.lastReviewedAt,
      nextReviewAt: scheduleResult.nextReviewAt,
    },
  });

  return {
    reviewAttempt,
    learningState: updatedState,
    scheduleResult,
    xpResult,
  };
}
