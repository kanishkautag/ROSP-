import prisma from "@rosp/db";
import { ReviewSubmissionInput } from "@rosp/shared";
import { LearningAlgorithmFactory } from "../learning/learning_algorithm_factory";

export async function getDueReviews(userId: string, limit = 20) {
  const now = new Date();

  return prisma.userWord.findMany({
    where: {
      userId,
      learningState: {
        OR: [
          { nextReviewAt: { lte: now } },
          { nextReviewAt: null },
        ],
      },
    },
    include: {
      vocabularyWord: true,
      learningState: true,
    },
    take: limit,
  });
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
  };
}
