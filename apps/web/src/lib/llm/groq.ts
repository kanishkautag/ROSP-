import { LLMConfig } from "./llm_config";
import {
  LLMProvider,
  ExercisePromptPayload,
  GeneratedExerciseResult,
} from "./llm_provider";

export class GroqProvider extends LLMProvider {
  readonly providerName = "GROQ";

  constructor(config: LLMConfig) {
    super(config);
  }

  async ping(): Promise<boolean> {
    return Boolean(this.config.apiKey);
  }

  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const primaryModel = this.config.model || "qwen/qwen3.8-27b";

    try {
      return await this.callApi(primaryModel, prompt, systemPrompt);
    } catch (err: any) {
      // If primary model has issues, retry with openai/gpt-oss-20b
      if (primaryModel !== "openai/gpt-oss-20b") {
        console.warn(`Groq primary model (${primaryModel}) failed, trying openai/gpt-oss-20b:`, err?.message);
        return await this.callApi("openai/gpt-oss-20b", prompt, systemPrompt);
      }
      throw err;
    }
  }

  private async callApi(model: string, prompt: string, systemPrompt?: string): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Groq API error HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
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

    const parsed = JSON.parse(rawResponse);
    return {
      question: parsed.question || `Practice word: "${payload.word}"`,
      answer: parsed.answer || payload.word,
      options: Array.isArray(parsed.options) ? parsed.options : [payload.word],
      explanation: parsed.explanation || `"${payload.word}": ${payload.meaning}`,
      rawResponse,
    };
  }
}
