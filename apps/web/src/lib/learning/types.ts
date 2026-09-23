export type AlgorithmName = "SM2" | "FSRS";

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
  rating: number; // typically 1 (Again/Hard) to 4-5 (Easy/Perfect)
  reviewedAt?: Date;
}

export interface ScheduleResult {
  repetitions: number;
  interval: number; // in days
  easeFactor?: number;
  difficulty?: number;
  stability?: number;
  retrievability?: number;
  lastReviewedAt: Date;
  nextReviewAt: Date;
}
