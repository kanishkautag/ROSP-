import { z } from "zod";

export const AnkiCardSchema = z.object({
  word: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().optional().nullable(),
  partOfSpeech: z.string().optional().nullable(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional().nullable(),
});

export type AnkiCard = z.infer<typeof AnkiCardSchema>;

export const AnkiImportInputSchema = z.object({
  targetListId: z.string().uuid().optional().nullable(),
  newListName: z.string().min(1).max(100).optional().nullable(),
  newListDescription: z.string().max(500).optional().nullable(),
  cards: z.array(AnkiCardSchema).min(1, "At least one valid card is required"),
});

export type AnkiImportInput = z.infer<typeof AnkiImportInputSchema>;
