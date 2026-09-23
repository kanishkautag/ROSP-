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
  const provider =
    providerEnv === "GROQ" ? LLMProviderType.GROQ : LLMProviderType.OLLAMA;

  if (provider === LLMProviderType.GROQ) {
    return {
      provider: LLMProviderType.GROQ,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: process.env.GROQ_API_KEY || "",
    };
  }

  return {
    provider: LLMProviderType.OLLAMA,
    model: process.env.OLLAMA_MODEL || "llama3",
    baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  };
}
