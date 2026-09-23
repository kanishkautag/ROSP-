import { LearningAlgorithm } from "./learning_algorithm";
import { AlgorithmName, LearningStateData, ReviewRatingInput, ScheduleResult } from "./types";

/**
 * SuperMemo 2 (SM2) Algorithm Implementation.
 * (Phase 1: Architecture placeholder. Mathematical formulas will be implemented in Phase 2.)
 */
export class SM2Algorithm extends LearningAlgorithm {
  readonly name: AlgorithmName = "SM2";

  initialize(): LearningStateData {
    const now = new Date();
    return {
      repetitions: 0,
      interval: 1.0,
      easeFactor: 2.5,
      lastReviewedAt: null,
      nextReviewAt: now,
    };
  }

  schedule(
    currentState: LearningStateData,
    review: ReviewRatingInput
  ): ScheduleResult {
    const now = review.reviewedAt ?? new Date();
    const prevRepetitions = currentState.repetitions ?? 0;
    const prevEase = currentState.easeFactor ?? 2.5;
    const prevInterval = currentState.interval ?? 1;

    // Phase 1 placeholder logic: simple increment for testing plumbing
    const nextInterval = review.rating >= 3 ? Math.max(1, prevInterval * 2) : 1;
    const nextReview = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

    return {
      repetitions: review.rating >= 3 ? prevRepetitions + 1 : 0,
      interval: nextInterval,
      easeFactor: prevEase,
      lastReviewedAt: now,
      nextReviewAt: nextReview,
    };
  }
}
