export enum LLMProviderType {
  OLLAMA = "OLLAMA",
  GROQ = "GROQ",
}

export interface LLMConfig {
  provider: LLMProviderType;
  model: string;
  baseUrl: string;
  apiKey?: string;
}

export function getLLMConfig(): LLMConfig {
  const providerEnv = process.env.LLM_PROVIDER?.toUpperCase();
  const groqKey = process.env.GROQ_API_KEY || "";

  // If GROQ_API_KEY is present or LLM_PROVIDER is explicitly GROQ, use Groq
  const useGroq = providerEnv === "GROQ" || (groqKey.length > 0 && providerEnv !== "OLLAMA");

  if (useGroq) {
    return {
      provider: LLMProviderType.GROQ,
      model: process.env.GROQ_MODEL || "qwen/qwen3.8-27b",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groqKey,
    };
  }

  return {
    provider: LLMProviderType.OLLAMA,
    model: process.env.OLLAMA_MODEL || "llama3",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  };
}
