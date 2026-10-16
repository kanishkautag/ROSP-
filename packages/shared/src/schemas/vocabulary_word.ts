import { z } from "zod";

export const CreateVocabularyWordSchema = z.object({
  word: z.string().min(1, "Word is required").max(100),
  language: z.string().min(2, "Language code is required").max(10).default("en"),
  meaning: z.string().min(1, "Meaning is required"),
  example: z.string().optional().nullable(),
  synonyms: z.array(z.string()).optional().default([]),
  partOfSpeech: z.string().max(50).optional().nullable(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().nullable(),
  frequency: z.number().nonnegative().optional().nullable(),
  frequencyRank: z.number().int().positive().optional().nullable(),
  source: z.string().max(150).optional().nullable(),
  romanization: z.string().optional().nullable(),
  nativeDefinition: z.string().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  forms: z.string().optional().nullable(),
  exampleTranslation: z.string().optional().nullable(),
  topic: z.string().max(50).optional().nullable(),
  difficulty: z.string().max(50).optional().nullable(),
  pronunciationUrl: z.string().optional().nullable(),
  sourceUrl: z.string().optional().nullable(),
  license: z.string().max(100).optional().nullable(),
});

export type CreateVocabularyWordInput = z.infer<typeof CreateVocabularyWordSchema>;

export const UpdateVocabularyWordSchema = CreateVocabularyWordSchema.partial();
export type UpdateVocabularyWordInput = z.infer<typeof UpdateVocabularyWordSchema>;

export const VocabularyWordQuerySchema = z.object({
  query: z.string().optional(),
  language: z.string().optional(),
  topic: z.string().optional(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type VocabularyWordQueryParams = z.infer<typeof VocabularyWordQuerySchema>;
