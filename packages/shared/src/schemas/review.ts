import { z } from "zod";

export const ReviewSubmissionSchema = z.object({
  userWordId: z.string().uuid("Invalid user word ID"),
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  exerciseId: z.string().uuid().optional().nullable(),
  userAnswer: z.string().optional().nullable(),
});

export type ReviewSubmissionInput = z.infer<typeof ReviewSubmissionSchema>;

export const DueReviewsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  wordListId: z.string().uuid().optional(),
});

export type DueReviewsQueryParams = z.infer<typeof DueReviewsQuerySchema>;
