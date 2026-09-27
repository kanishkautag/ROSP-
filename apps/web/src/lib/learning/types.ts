export type AlgorithmName = "SM2" | "FSRS";

export const Rating = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
} as const;

export type RatingType = (typeof Rating)[keyof typeof Rating];

export interface LearningStateData {
  repetitions?: number | null;
  interval?: number | null;
  easeFactor?: number | null;
  difficulty?: number | null;
  stability?: number | null;
  retrievability?: number | null;
  lastReviewedAt?: Date | null;
  nextReviewAt?: Date | null;
}

export interface ReviewRatingInput {
  rating: number; // 1: Again, 2: Hard, 3: Good, 4: Easy
  reviewedAt?: Date;
}

export interface ScheduleResult {
  repetitions: number;
  interval: number; // in days
  easeFactor: number;
  difficulty: number;
  stability: number;
  retrievability: number;
  lastReviewedAt: Date;
  nextReviewAt: Date;
}
