export * from "../constants/index";
export * from "../schemas/index";

export interface UserDTO {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  timezone: string;
  dailyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VocabularyWordDTO {
  id: string;
  word: string;
  language: string;
  meaning: string;
  example: string | null;
  synonyms?: string[];
  partOfSpeech: string | null;
  cefrLevel: string | null;
  frequency: number | null;
  frequencyRank: number | null;
  source: string | null;
  romanization?: string | null;
  nativeDefinition?: string | null;
  gender?: string | null;
  forms?: string | null;
  exampleTranslation?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  pronunciationUrl?: string | null;
  sourceUrl?: string | null;
  license?: string | null;
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
  algorithm: "SM2" | "FSRS" | string;
  repetitions: number | null;
  interval: number | null;
  easeFactor: number | null;
  difficulty: number | null;
  stability: number | null;
  retrievability: number | null;
  lastReviewedAt: Date | null;
  nextReviewAt: Date | null;
}

export interface DailyActivityDTO {
  id: string;
  userId: string;
  activityDate: string;
  uniqueWordsReviewed: number;
  dailyGoalCompletedAt: Date | null;
  xpEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface XpEventDTO {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  activityDate: string;
  vocabularyWordId: string | null;
  createdAt: Date;
}

export interface DashboardSummaryDTO {
  wordsDueToday: number;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  dailyGoal: number;
  uniqueWordsReviewedToday: number;
  dailyGoalCompletedToday: boolean;
  wordsLearned: number;
  totalWords: number;
}
