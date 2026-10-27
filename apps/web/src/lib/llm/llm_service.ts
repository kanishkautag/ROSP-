import { getLLMConfig, getOpenRouterConfig, LLMConfig, LLMProviderType } from "./llm_config";
import { LLMProvider, ExercisePromptPayload, GeneratedExerciseResult } from "./llm_provider";
import { OllamaProvider } from "./ollama";
import { GroqProvider } from "./groq";
import { OpenRouterProvider } from "./openrouter";
import { generateFallbackExercise } from "./fallback_generator";

/**
 * Service that encapsulates LLM operations and provider selection.
 * Cascades from Primary (Groq) -> Secondary Fallback (OpenRouter / Nemotron) -> Deterministic fallback.
 * Always guarantees exercise generation via deterministic fallback if LLMs are unavailable.
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
    let provider: LLMProvider;
    if (config.provider === LLMProviderType.OPENROUTER && config.apiKey) {
      provider = new OpenRouterProvider(config);
    } else if (config.provider === LLMProviderType.GROQ && config.apiKey) {
      provider = new GroqProvider(config);
    } else {
      provider = new OllamaProvider(config);
    }
    return { provider, config };
  }

  private getOpenRouterFallback(): LLMProvider | null {
    const openRouterConfig = getOpenRouterConfig();
    if (openRouterConfig.apiKey) {
      return new OpenRouterProvider(openRouterConfig);
    }
    return null;
  }

  public getProviderName(): string {
    return this.getActive().provider.providerName;
  }

  public getModelName(): string {
    return this.getActive().config.model;
  }

  public async ping(): Promise<boolean> {
    try {
      const { provider } = this.getActive();
      const primaryOk = await provider.ping();
      if (primaryOk) return true;
      const openRouter = this.getOpenRouterFallback();
      if (openRouter) return await openRouter.ping();
      return false;
    } catch {
      return false;
    }
  }

  public async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    const { provider } = this.getActive();

    // 1. Try Primary LLM Provider (Groq)
    try {
      const result = await provider.generateExercise(payload);
      if (result && result.question && result.answer) {
        return result;
      }
    } catch (error) {
      console.warn(
        `Primary LLM provider (${provider.providerName}) unavailable or failed:`,
        error instanceof Error ? error.message : error
      );
    }

    // 2. Try OpenRouter Fallback (NVIDIA Nemotron 3.5 Lightning)
    if (provider.providerName !== "OPENROUTER") {
      const openRouter = this.getOpenRouterFallback();
      if (openRouter) {
        try {
          console.info("Failing over to OpenRouter (NVIDIA Nemotron 3.5 Lightning)...");
          const orResult = await openRouter.generateExercise(payload);
          if (orResult && orResult.question && orResult.answer) {
            return orResult;
          }
        } catch (orError) {
          console.warn(
            "OpenRouter fallback provider failed:",
            orError instanceof Error ? orError.message : orError
          );
        }
      }
    }

    // 3. Seamless zero-failure deterministic fallback
    return generateFallbackExercise(payload);
  }
}

export const llmService = LLMService.getInstance();
