import { LLMConfig } from "./llm_config";
import {
  LLMProvider,
  ExercisePromptPayload,
  GeneratedExerciseResult,
} from "./llm_provider";

export class OpenRouterProvider extends LLMProvider {
  readonly providerName = "OPENROUTER";

  constructor(config: LLMConfig) {
    super(config);
  }

  async ping(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const model = this.config.model || "nvidia/nemotron-3.5-lightning:free";
    const baseUrl = this.config.baseUrl || "https://openrouter.ai/api/v1";

    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "ROSP Language Learning",
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`OpenRouter API error HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  private cleanJson(raw: string): string {
    let cleaned = raw.trim();
    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    // Extract first {...} or [...] if extra prose exists
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    return cleaned;
  }

  async generateExercise(
    payload: ExercisePromptPayload
  ): Promise<GeneratedExerciseResult> {
    let taskGuidance = "";

    if (payload.exerciseType === "MULTIPLE_CHOICE") {
      taskGuidance = `Create a multiple choice definition quiz for "${payload.word}".
"question": "What is the correct meaning of \\"${payload.word}\\"?"
"answer": "${payload.meaning}"
"options": An array of exactly 4 clearly distinct options. One must be "${payload.meaning}". The other 3 MUST be completely different definitions for unrelated everyday concepts (e.g. vehicles, sports, cooking, weather) so there is zero ambiguity or overlapping meaning.
"explanation": Clear explanation of why the correct definition matches "${payload.word}".`;
    } else if (payload.exerciseType === "FILL_BLANK") {
      taskGuidance = `Create a fill-in-the-blank exercise for "${payload.word}".
"question": A realistic sentence demonstrating the meaning ("${payload.meaning}"), replacing "${payload.word}" with [___].
"answer": "${payload.word}"
"options": An array of 4 distinct single words (the correct word "${payload.word}" plus 3 common alternative words of the same part of speech).
"explanation": Brief explanation of how "${payload.word}" fits the context.`;
    } else {
      // SENTENCE_CONSTRUCTION
      taskGuidance = `Create a sentence construction exercise for "${payload.word}".
"question": "Construct a correct sentence using the word \\"${payload.word}\\":"
"answer": A natural 5 to 9 word sentence using "${payload.word}".
"options": A shuffled array of all the words from that exact sentence (without punctuation).
"explanation": Sentence breakdown and meaning.`;
    }

    const prompt = `Generate a language learning vocabulary exercise:
Target Word: "${payload.word}"
Language: "${payload.language}"
Meaning: "${payload.meaning}"
Example: "${payload.example || ""}"
Exercise Type: ${payload.exerciseType}

${taskGuidance}

Output ONLY a JSON object with keys "question", "answer", "options", and "explanation".`;

    const rawResponse = await this.generate(
      prompt,
      "You are an expert language teacher. Respond ONLY with a valid JSON object matching the requested schema without markdown backticks."
    );

    const cleaned = this.cleanJson(rawResponse);
    const parsed = JSON.parse(cleaned);
    let options: string[] = Array.isArray(parsed.options) ? parsed.options : [payload.word];

    if (payload.exerciseType === "SENTENCE_CONSTRUCTION") {
      let tokens = options
        .map((tok: string) => String(tok).replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "").trim())
        .filter(Boolean);

      if (tokens.length < 3 && parsed.answer) {
        tokens = String(parsed.answer)
          .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
          .split(/\s+/)
          .filter(Boolean);
      }

      // Enforce true Fisher-Yates shuffle that is different from original
      const originalOrder = tokens.join(" ");
      let attempts = 0;
      while (attempts < 10) {
        for (let i = tokens.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
        }
        if (tokens.join(" ") !== originalOrder || tokens.length <= 1) break;
        attempts++;
      }
      options = tokens;
    }

    return {
      question: parsed.question || `Practice exercise for "${payload.word}":`,
      answer: parsed.answer || payload.word,
      options,
      explanation: parsed.explanation || `"${payload.word}": ${payload.meaning}`,
      rawResponse,
    };
  }
}
