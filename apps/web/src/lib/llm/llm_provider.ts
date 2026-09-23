import { LLMConfig } from "./llm_config";

export interface ExercisePromptPayload {
  word: string;
  language: string;
  meaning: string;
  example?: string | null;
  exerciseType: string;
}

export interface GeneratedExerciseResult {
  question: string;
  answer: string;
  options?: string[];
  explanation?: string;
  rawResponse?: string;
}

/**
 * Base class for LLM providers (Ollama, Groq).
 */
export abstract class LLMProvider {
  protected config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
  }

  abstract readonly providerName: string;

  /**
   * Health check to test if the LLM provider service or API is reachable.
   */
  abstract ping(): Promise<boolean>;

  /**
   * Generates a raw text completion.
   */
  abstract generate(prompt: string, systemPrompt?: string): Promise<string>;

  /**
   * Generates a structured vocabulary exercise (Phase 1 placeholder, implemented in Phase 3).
   */
  abstract generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult>;
}
