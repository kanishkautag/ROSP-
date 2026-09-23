import { LearningAlgorithm } from "./learning_algorithm";
import { AlgorithmName, LearningStateData, ReviewRatingInput, ScheduleResult } from "./types";

/**
 * Free Spaced Repetition Scheduler (FSRS) Algorithm Implementation.
 * (Phase 1: Architecture placeholder. Mathematical formulas will be implemented in Phase 2.)
 */
export class FSRSAlgorithm extends LearningAlgorithm {
  readonly name: AlgorithmName = "FSRS";

  initialize(): LearningStateData {
    const now = new Date();
    return {
      difficulty: 5.0,
      stability: 1.0,
      retrievability: 1.0,
      lastReviewedAt: null,
      nextReviewAt: now,
    };
  }

  schedule(
    currentState: LearningStateData,
    review: ReviewRatingInput
  ): ScheduleResult {
    const now = review.reviewedAt ?? new Date();
    const prevStability = currentState.stability ?? 1.0;
    const prevDifficulty = currentState.difficulty ?? 5.0;

    // Phase 1 placeholder logic: simple increment for testing plumbing
    const nextInterval = Math.max(1, Math.round(prevStability * (review.rating >= 3 ? 2 : 1)));
    const nextReview = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

    return {
      repetitions: (currentState.repetitions ?? 0) + 1,
      interval: nextInterval,
      difficulty: prevDifficulty,
      stability: prevStability * 1.5,
      retrievability: 0.9,
      lastReviewedAt: now,
      nextReviewAt: nextReview,
    };
  }
}
