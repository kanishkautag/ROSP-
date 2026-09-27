import { LLMConfig } from "./llm_config";
import {
  LLMProvider,
  ExercisePromptPayload,
  GeneratedExerciseResult,
} from "./llm_provider";

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

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const res = await fetch(`${this.config.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        prompt,
        system: systemPrompt,
        stream: false,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`Ollama error HTTP ${res.status}`);
    }

    const data = await res.json();
    return data.response;
  }

  async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    const prompt = `You are a language learning tutor. Generate a vocabulary exercise for the target word:
Word: "${payload.word}"
Language: ${payload.language}
Meaning: "${payload.meaning}"
Example: "${payload.example || ""}"
Exercise Type: ${payload.exerciseType}

Respond ONLY in valid raw JSON with this exact schema:
{
  "question": "clear exercise question prompt",
  "answer": "${payload.word}",
  "options": ["${payload.word}", "distractor1", "distractor2", "distractor3"],
  "explanation": "concise explanation of why this answer is correct"
}`;

    const rawResponse = await this.generate(
      prompt,
      "You output ONLY valid, unquoted raw JSON without markdown code fences."
    );

    const cleaned = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    return {
      question: parsed.question || `Use "${payload.word}" in context.`,
      answer: parsed.answer || payload.word,
      options: Array.isArray(parsed.options) ? parsed.options : [payload.word],
      explanation: parsed.explanation || `Definition: ${payload.meaning}`,
      rawResponse,
    };
  }
}
