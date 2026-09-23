export const ALGORITHMS = {
  SM2: "SM2",
  FSRS: "FSRS",
} as const;

export type AlgorithmType = (typeof ALGORITHMS)[keyof typeof ALGORITHMS];

export const EXERCISE_TYPES = {
  FILL_BLANK: "FILL_BLANK",
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  SENTENCE_CONSTRUCTION: "SENTENCE_CONSTRUCTION",
} as const;

export type ExerciseType = (typeof EXERCISE_TYPES)[keyof typeof EXERCISE_TYPES];

export const LLM_PROVIDERS = {
  OLLAMA: "OLLAMA",
  GROQ: "GROQ",
} as const;

export type LLMProviderType = (typeof LLM_PROVIDERS)[keyof typeof LLM_PROVIDERS];

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CefrLevel = (typeof CEFR_LEVELS)[number];
