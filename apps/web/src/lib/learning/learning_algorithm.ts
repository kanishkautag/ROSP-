import { AlgorithmName, LearningStateData, ReviewRatingInput, ScheduleResult } from "./types";

/**
 * Base abstraction for all spaced repetition algorithms (SM2, FSRS, etc.)
 * Provides uniform interface for initializing card states and calculating next review schedules.
 */
export abstract class LearningAlgorithm {
  abstract readonly name: AlgorithmName;

  /**
   * Initializes default learning state for a newly added vocabulary word.
   */
  abstract initialize(): LearningStateData;

  /**
   * Schedules the next review interval based on user rating and current state.
   */
  abstract schedule(
    currentState: LearningStateData,
    review: ReviewRatingInput
  ): ScheduleResult;
}
