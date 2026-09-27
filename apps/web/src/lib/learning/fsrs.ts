import { LearningAlgorithm } from "./learning_algorithm";
import { AlgorithmName, LearningStateData, ReviewRatingInput, ScheduleResult, Rating } from "./types";

/**
 * Free Spaced Repetition Scheduler (FSRS) Algorithm Implementation.
 * Modern memory modeling with Difficulty (D), Stability (S), and Retrievability decay (R).
 */
export class FSRSAlgorithm extends LearningAlgorithm {
  readonly name: AlgorithmName = "FSRS";

  // Target retention probability (default: 90%)
  private readonly requestRetention = 0.9;
  private readonly decayFactor = 0.19;

  initialize(): LearningStateData {
    const now = new Date();
    return {
      repetitions: 0,
      interval: 1.0,
      easeFactor: 2.5,
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
    const prevDifficulty = currentState.difficulty ?? 5.0;
    const prevStability = currentState.stability ?? 1.0;
    const prevRepetitions = currentState.repetitions ?? 0;

    // Calculate days elapsed since last review
    let elapsedDays = 0;
    if (currentState.lastReviewedAt) {
      const diffMs = now.getTime() - new Date(currentState.lastReviewedAt).getTime();
      elapsedDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
    }

    // Retrievability decay formula: R(t) = (1 + 0.19 * t / S)^(-0.5)
    const currentRetrievability =
      prevStability > 0
        ? Math.pow(1 + (this.decayFactor * elapsedDays) / prevStability, -0.5)
        : 1.0;

    let nextDifficulty = prevDifficulty;
    let nextStability = prevStability;

    if (prevRepetitions === 0 || !currentState.lastReviewedAt) {
      // First review initialization based on initial grade
      switch (review.rating) {
        case Rating.AGAIN:
          nextDifficulty = 7.5;
          nextStability = 0.5;
          break;
        case Rating.HARD:
          nextDifficulty = 6.2;
          nextStability = 1.4;
          break;
        case Rating.GOOD:
          nextDifficulty = 5.0;
          nextStability = 3.2;
          break;
        case Rating.EASY:
          nextDifficulty = 3.5;
          nextStability = 7.0;
          break;
        default:
          nextDifficulty = 5.0;
          nextStability = 2.0;
          break;
      }
    } else {
      // Subsequent reviews update
      const retrievabilityFactor = Math.max(0.01, 1 - currentRetrievability);
      const difficultyModifier = Math.max(1, 11 - prevDifficulty);

      switch (review.rating) {
        case Rating.AGAIN: // Lapse
          nextDifficulty = Math.min(10.0, prevDifficulty + 1.2);
          nextStability = Math.max(0.4, prevStability * 0.25);
          break;

        case Rating.HARD:
          nextDifficulty = Math.min(10.0, prevDifficulty + 0.6);
          nextStability = Math.max(1.0, prevStability * (1 + 0.25 * difficultyModifier * retrievabilityFactor));
          break;

        case Rating.GOOD:
          nextDifficulty = Math.max(1.0, prevDifficulty - 0.2);
          nextStability = Math.max(1.0, prevStability * (1 + 0.65 * difficultyModifier * retrievabilityFactor));
          break;

        case Rating.EASY:
          nextDifficulty = Math.max(1.0, prevDifficulty - 0.8);
          nextStability = Math.max(1.0, prevStability * (1 + 1.2 * difficultyModifier * retrievabilityFactor * 1.3));
          break;
      }
    }

    // Calculate next interval to target 90% retention
    // Interval = S * ((R^(-2) - 1) / 0.19) where R = 0.9 -> factor approx 1.0 ~ 1.2
    const nextInterval =
      review.rating === Rating.AGAIN
        ? 1.0
        : Math.max(1.0, Math.round(nextStability * 1.05));

    const nextReviewAt = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

    return {
      repetitions: review.rating === Rating.AGAIN ? 0 : prevRepetitions + 1,
      interval: nextInterval,
      easeFactor: Math.round((currentState.easeFactor ?? 2.5) * 100) / 100,
      difficulty: Math.round(nextDifficulty * 100) / 100,
      stability: Math.round(nextStability * 100) / 100,
      retrievability: Math.round(currentRetrievability * 100) / 100,
      lastReviewedAt: now,
      nextReviewAt,
    };
  }
}
