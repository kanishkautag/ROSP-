export enum LLMProviderType {
  OLLAMA = "OLLAMA",
  GROQ = "GROQ",
  OPENROUTER = "OPENROUTER",
}

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  baseUrl: string;
  apiKey?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterBaseUrl?: string;
}

export function getOpenRouterConfig(): LLMConfig {
  return {
    provider: LLMProviderType.OPENROUTER,
    model: process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free",
    baseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY || "",
  };
}

export function getLLMConfig(): LLMConfig {
  const providerEnv = process.env.LLM_PROVIDER?.toUpperCase();
  const groqKey = process.env.GROQ_API_KEY || "";
  const openrouterKey = process.env.OPENROUTER_API_KEY || "";
  const openrouterModel = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3.5-lightning:free";
  const openrouterBaseUrl = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

  if (providerEnv === "OPENROUTER") {
    return {
      provider: LLMProviderType.OPENROUTER,
      model: openrouterModel,
      baseUrl: openrouterBaseUrl,
      apiKey: openrouterKey,
      openrouterApiKey: openrouterKey,
      openrouterModel,
      openrouterBaseUrl,
    };
  }

  // If GROQ_API_KEY is present or LLM_PROVIDER is explicitly GROQ, use Groq as primary
  const useGroq = providerEnv === "GROQ" || (groqKey.length > 0 && providerEnv !== "OLLAMA");

  if (useGroq) {
    return {
      provider: LLMProviderType.GROQ,
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
      openrouterApiKey: openrouterKey,
      openrouterModel,
      openrouterBaseUrl,
    };
  }

  return {
    provider: LLMProviderType.OLLAMA,
    model: process.env.OLLAMA_MODEL || "llama3",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    openrouterApiKey: openrouterKey,
    openrouterModel,
    openrouterBaseUrl,
  };
}
