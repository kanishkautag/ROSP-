import { z } from "zod";
import { EXERCISE_TYPES } from "../constants/index";

export const ExerciseRequestSchema = z.object({
  vocabularyWordId: z.string().uuid("Invalid vocabulary word ID"),
  type: z.enum([
    EXERCISE_TYPES.FILL_BLANK,
    EXERCISE_TYPES.MULTIPLE_CHOICE,
    EXERCISE_TYPES.SENTENCE_CONSTRUCTION,
  ]).default(EXERCISE_TYPES.FILL_BLANK),
  targetLanguage: z.string().default("en"),
});

export type ExerciseRequestInput = z.infer<typeof ExerciseRequestSchema>;

export const ExerciseResponseSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum([
    EXERCISE_TYPES.FILL_BLANK,
    EXERCISE_TYPES.MULTIPLE_CHOICE,
    EXERCISE_TYPES.SENTENCE_CONSTRUCTION,
  ]),
  question: z.string().min(1),
  options: z.array(z.string()).optional(),
  answer: z.string().min(1),
  explanation: z.string().optional().nullable(),
  provider: z.string(),
  model: z.string(),
});

export type ExerciseResponseOutput = z.infer<typeof ExerciseResponseSchema>;
