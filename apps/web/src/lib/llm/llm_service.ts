import { getLLMConfig, LLMConfig, LLMProviderType } from "./llm_config";
import { LLMProvider, ExercisePromptPayload, GeneratedExerciseResult } from "./llm_provider";
import { OllamaProvider } from "./ollama";
import { GroqProvider } from "./groq";
import { generateFallbackExercise } from "./fallback_generator";

/**
 * Service that encapsulates LLM operations and provider selection.
 * Always guarantees exercise generation via deterministic fallback if LLM is unavailable.
 */
export class LLMService {
  private static instance: LLMService;

  private constructor() {}

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  private getActive(): { provider: LLMProvider; config: LLMConfig } {
    const config = getLLMConfig();
    const provider =
      config.provider === LLMProviderType.GROQ && config.apiKey
        ? new GroqProvider(config)
        : new OllamaProvider(config);
    return { provider, config };
  }

  public getProviderName(): string {
    return this.getActive().provider.providerName;
  }

  public getModelName(): string {
    return this.getActive().config.model;
  }

  public async ping(): Promise<boolean> {
    try {
      return await this.getActive().provider.ping();
    } catch {
      return false;
    }
  }

  public async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    const { provider } = this.getActive();
    try {
      const result = await provider.generateExercise(payload);
      if (result && result.question && result.answer) {
        return result;
      }
    } catch (error) {
      console.warn(
        `LLM provider (${provider.providerName}) unavailable or failed:`,
        error instanceof Error ? error.message : error
      );
    }

    // Seamless zero-failure fallback
    return generateFallbackExercise(payload);
  }
}

export const llmService = LLMService.getInstance();
