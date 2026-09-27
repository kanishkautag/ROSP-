import { z } from "zod";

export const ReviewRatingEnum = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
} as const;

export type ReviewRatingValue = (typeof ReviewRatingEnum)[keyof typeof ReviewRatingEnum];

export const ReviewSubmissionSchema = z.object({
  userWordId: z.string().uuid("Invalid user word ID"),
  rating: z.number().int().min(1).max(4), // 1: Again, 2: Hard, 3: Good, 4: Easy
  exerciseId: z.string().uuid().optional().nullable(),
  userAnswer: z.string().optional().nullable(),
  sessionId: z.string().uuid().optional().nullable(),
  responseTimeMs: z.number().int().nonnegative().optional().nullable(),
});

export type ReviewSubmissionInput = z.infer<typeof ReviewSubmissionSchema>;

export const DueReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  wordListId: z.string().uuid().optional(),
});

export type DueReviewsQueryParams = z.infer<typeof DueReviewsQuerySchema>;
