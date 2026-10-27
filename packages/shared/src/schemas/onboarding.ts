import { z } from "zod";

/** Languages supported end-to-end (vocabulary, dictionary, TTS). */
export const SUPPORTED_LANGUAGES = ["en", "hi", "mr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const OnboardingSchema = z.object({
  nativeLanguage: z.enum(SUPPORTED_LANGUAGES).default("en"),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES).default("en"),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).default("B1"),
  dailyGoal: z.number().int().min(5).max(100).default(20),
  algorithm: z.enum(["SM2", "FSRS"]).default("SM2"),
});

export type OnboardingInput = z.infer<typeof OnboardingSchema>;
