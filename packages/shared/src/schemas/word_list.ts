import { z } from "zod";

export const CreateWordListSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  description: z.string().max(500, "Description must be 500 characters or fewer").optional().nullable(),
});

export type CreateWordListInput = z.infer<typeof CreateWordListSchema>;

export const UpdateWordListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

export type UpdateWordListInput = z.infer<typeof UpdateWordListSchema>;

export const AddWordsToListSchema = z.object({
  wordIds: z.array(z.string().uuid("Invalid vocabulary word ID")).min(1, "At least one word ID required"),
});

export type AddWordsToListInput = z.infer<typeof AddWordsToListSchema>;

export const MoveWordSchema = z.object({
  wordId: z.string().uuid("Invalid word ID"),
  sourceListId: z.string().uuid("Invalid source list ID"),
  targetListId: z.string().uuid("Invalid target list ID"),
});

export type MoveWordInput = z.infer<typeof MoveWordSchema>;

export const MergeListsSchema = z.object({
  sourceListId: z.string().uuid("Invalid source list ID"),
  targetListId: z.string().uuid("Invalid target list ID"),
  deleteSource: z.boolean().default(true),
});

export type MergeListsInput = z.infer<typeof MergeListsSchema>;
