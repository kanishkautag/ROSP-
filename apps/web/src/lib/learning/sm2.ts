import { LearningAlgorithm } from "./learning_algorithm";
import { AlgorithmName, LearningStateData, ReviewRatingInput, ScheduleResult, Rating } from "./types";

/**
 * SuperMemo 2 (SM2) Algorithm Implementation.
 * Full mathematical formulation tailored for 4-button review interface (Again, Hard, Good, Easy).
 */
export class SM2Algorithm extends LearningAlgorithm {
  readonly name: AlgorithmName = "SM2";

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
    const prevRepetitions = currentState.repetitions ?? 0;
    const prevEase = currentState.easeFactor ?? 2.5;
    const prevInterval = currentState.interval ?? 1.0;

    let nextRepetitions = prevRepetitions;
    let nextInterval = prevInterval;
    let nextEase = prevEase;

    switch (review.rating) {
      case Rating.AGAIN: // 1: Complete recall failure
        nextRepetitions = 0;
        nextInterval = 1.0;
        nextEase = Math.max(1.3, prevEase - 0.2);
        break;

      case Rating.HARD: // 2: Recalled with significant difficulty
        nextRepetitions = prevRepetitions + 1;
        nextInterval = Math.max(1.0, Math.round(prevInterval * 1.2 * 10) / 10);
        nextEase = Math.max(1.3, prevEase - 0.15);
        break;

      case Rating.GOOD: // 3: Successful standard recall
        if (prevRepetitions === 0) {
          nextInterval = 1.0;
        } else if (prevRepetitions === 1) {
          nextInterval = 6.0;
        } else {
          nextInterval = Math.max(1.0, Math.round(prevInterval * prevEase));
        }
        nextRepetitions = prevRepetitions + 1;
        nextEase = prevEase;
        break;

      case Rating.EASY: // 4: Instant perfect recall
        if (prevRepetitions === 0) {
          nextInterval = 3.0;
        } else if (prevRepetitions === 1) {
          nextInterval = 8.0;
        } else {
          nextInterval = Math.max(1.0, Math.round(prevInterval * prevEase * 1.3));
        }
        nextRepetitions = prevRepetitions + 1;
        nextEase = Math.min(3.0, prevEase + 0.15);
        break;

      default:
        nextInterval = Math.max(1.0, prevInterval);
        break;
    }

    const nextReviewAt = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

    return {
      repetitions: nextRepetitions,
      interval: nextInterval,
      easeFactor: Math.round(nextEase * 100) / 100,
      difficulty: currentState.difficulty ?? 5.0,
      stability: nextInterval,
      retrievability: review.rating >= Rating.GOOD ? 0.95 : 0.6,
      lastReviewedAt: now,
      nextReviewAt,
    };
  }
}
