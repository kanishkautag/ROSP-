import { LLMConfig } from "./llm_config";
import {
  LLMProvider,
  ExercisePromptPayload,
  GeneratedExerciseResult,
} from "./llm_provider";

/**
 * Ollama local LLM provider implementation.
 * (Phase 1: Architecture placeholder. Actual model calls implemented in Phase 3.)
 */
export class OllamaProvider extends LLMProvider {
  readonly providerName = "OLLAMA";

  constructor(config: LLMConfig) {
    super(config);
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.baseUrl}/api/version`, {
        signal: AbortSignal.timeout(2000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async generate(prompt: string, _systemPrompt?: string): Promise<string> {
    // Architecture placeholder
    return `[Ollama Mock Completion for model ${this.config.model}]: ${prompt.slice(0, 30)}...`;
  }

  async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    // Phase 1 placeholder
    return {
      question: `Fill in the blank: She saw a [___] on the tree. (${payload.meaning})`,
      answer: payload.word,
      options: [payload.word, "orange", "bird", "flower"],
      explanation: `"${payload.word}" fits the context of: ${payload.meaning}`,
    };
  }
}
