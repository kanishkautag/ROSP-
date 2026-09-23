import { LLMConfig } from "./llm_config";
import {
  LLMProvider,
  ExercisePromptPayload,
  GeneratedExerciseResult,
} from "./llm_provider";

/**
 * Groq cloud LLM provider implementation.
 * (Phase 1: Architecture placeholder. Actual API calls implemented in Phase 3.)
 */
export class GroqProvider extends LLMProvider {
  readonly providerName = "GROQ";

  constructor(config: LLMConfig) {
    super(config);
  }

  async ping(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async generate(prompt: string, _systemPrompt?: string): Promise<string> {
    // Architecture placeholder
    return `[Groq Mock Completion for model ${this.config.model}]: ${prompt.slice(0, 30)}...`;
  }

  async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    // Phase 1 placeholder
    return {
      question: `Choose the correct word: The scientist discovered an [___] principle.`,
      answer: payload.word,
      options: [payload.word, "unusual", "easy", "simple"],
      explanation: `"${payload.word}" is an important term defined as: ${payload.meaning}`,
    };
  }
}
