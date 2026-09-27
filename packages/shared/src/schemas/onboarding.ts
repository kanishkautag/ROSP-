import { z } from "zod";

export const OnboardingSchema = z.object({
  nativeLanguage: z.string().min(2).max(10).default("en"),
  targetLanguage: z.string().min(2).max(10).default("es"),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("B1"),
  dailyGoal: z.number().int().min(5).max(100).default(20),
  algorithm: z.enum(["SM2", "FSRS"]).default("SM2"),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
