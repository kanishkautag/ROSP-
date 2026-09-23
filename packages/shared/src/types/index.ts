export * from "../constants/index";
export * from "../schemas/index";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyWordDTO {
  id: string;
  word: string;
  language: string;
  meaning: string;
  example: string | null;
  partOfSpeech: string | null;
  cefrLevel: string | null;
  frequency: number | null;
  frequencyRank: number | null;
  source: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordListDTO {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  wordCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LearningStateDTO {
  id: string;
  userWordId: string;
  algorithm: "SM2" | "FSRS";
  repetitions: number | null;
  interval: number | null;
  easeFactor: number | null;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
}

export interface DashboardSummaryDTO {
  wordsDueToday: number;
  currentStreak: number;
  wordsLearned: number;
  totalWords: number;
}
