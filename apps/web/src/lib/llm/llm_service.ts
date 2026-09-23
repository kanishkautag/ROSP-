import { getLLMConfig, LLMConfig, LLMProviderType } from "./llm_config";
import { LLMProvider, ExercisePromptPayload, GeneratedExerciseResult } from "./llm_provider";
import { OllamaProvider } from "./ollama";
import { GroqProvider } from "./groq";

/**
 * Service that encapsulates LLM operations and provider selection.
 * The provider is determined strictly by application configuration, not by UI input.
 */
export class LLMService {
  private static instance: LLMService;
  private provider: LLMProvider;
  private config: LLMConfig;

  private constructor() {
    this.config = getLLMConfig();
    if (this.config.provider === LLMProviderType.GROQ) {
      this.provider = new GroqProvider(this.config);
    } else {
      this.provider = new OllamaProvider(this.config);
    }
  }

  public static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  public getProviderName(): string {
    return this.provider.providerName;
  }

  public getModelName(): string {
    return this.config.model;
  }

  public async ping(): Promise<boolean> {
    return this.provider.ping();
  }

  public async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    return this.provider.generateExercise(payload);
  }
}

export const llmService = LLMService.getInstance();
