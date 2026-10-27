import { getLLMConfig } from "../../llm/llm_config";
import { DictionaryEntry, IDictionaryProvider } from "./types";

/**
 * Groq LLM Dictionary Provider
 * Authoritative fallback engine for multilingual lookups (English, Hindi, Marathi)
 * when third-party public dictionary APIs are unreachable, timed out, or lack rare terms.
 */
export class GroqLLMDictionaryProvider implements IDictionaryProvider {
  readonly name = "Authoritative Multilingual Lexicon Engine (AI)";

  isAvailable(): boolean {
    const config = getLLMConfig();
    return Boolean(config.apiKey || config.openrouterApiKey);
  }

  supportsLanguage(): boolean {
    return true;
  }

  async lookup(word: string, language?: string): Promise<DictionaryEntry | null> {
    const config = getLLMConfig();
    if (!config.apiKey && !config.openrouterApiKey) return null;

    const query = word.trim().normalize("NFC");
    if (!query) return null;

    const isDevanagari = /[\u0900-\u097F]/.test(query);
    const targetLang = language && language !== "ALL" ? language : isDevanagari ? "hi" : "en";

    const systemPrompt = `You are an authoritative multilingual dictionary engine modeled after Oxford, Cambridge, and Bharatavani lexicons.
Given any query, output a valid JSON object matching this schema exactly:
{
  "word": "canonical dictionary form of the word",
  "language": "${targetLang}",
  "phonetic": "accurate IPA transcription or null",
  "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "phrase",
  "meaning": "Concise, authoritative definition",
  "example": "A natural, high-quality example sentence showcasing the word in context",
  "cefrLevel": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "synonyms": ["synonym1", "synonym2"],
  "hindiTranslation": "${targetLang === "hi" || targetLang === "mr" ? "English translation" : "Hindi translation in Devanagari"}",
  "mnemonic": "A short, memorable 1-sentence mnemonic hook or memory trick"
}`;

    const userPrompt = `Define and look up: "${query}" in language "${targetLang}".`;

    // 1. Try Groq models first if Groq API key is configured
    if (config.apiKey) {
      const modelsToTry = [config.model || "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];

      for (const model of modelsToTry) {
        try {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              response_format: { type: "json_object" },
              temperature: 0.1,
            }),
            signal: AbortSignal.timeout(8000),
          });

          if (res.ok) {
            const data = await res.json();
            const rawJson = data.choices?.[0]?.message?.content || "";
            if (rawJson) {
              const parsed = JSON.parse(rawJson);
              return {
                word: parsed.word || query,
                language: parsed.language || targetLang,
                phonetic: parsed.phonetic || null,
                partOfSpeech: parsed.partOfSpeech || "word",
                meaning: parsed.meaning || "Definition found",
                example: parsed.example || null,
                cefrLevel: parsed.cefrLevel || "B1",
                synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
                hindiTranslation: parsed.hindiTranslation || null,
                mnemonic: parsed.mnemonic || null,
                source: "Authoritative Lexicon Engine (Groq AI)",
                sourceUrl: null,
                license: "Open Educational Resource",
                isLocal: false,
                canPersist: true,
              };
            }
          }
        } catch (err: any) {
          console.warn(`Groq dictionary lookup attempt with ${model} failed:`, err?.message);
        }
      }
    }

    // 2. Cascade to OpenRouter fallback (NVIDIA Nemotron 3.5 Lightning)
    if (config.openrouterApiKey) {
      try {
        const orModel = config.openrouterModel || "nvidia/nemotron-3.5-lightning:free";
        const orBaseUrl = config.openrouterBaseUrl || "https://openrouter.ai/api/v1";
        const res = await fetch(`${orBaseUrl.replace(/\/+$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.openrouterApiKey}`,
            "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
            "X-Title": "ROSP Language Learning",
          },
          body: JSON.stringify({
            model: orModel,
            messages: [
              { role: "system", content: `${systemPrompt}\nOutput ONLY valid raw JSON without markdown formatting.` },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.1,
          }),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok) {
          const data = await res.json();
          let rawJson = data.choices?.[0]?.message?.content || "";
          if (rawJson) {
            rawJson = rawJson.trim();
            if (rawJson.startsWith("```")) {
              rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
            }
            const firstBrace = rawJson.indexOf("{");
            const lastBrace = rawJson.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              rawJson = rawJson.substring(firstBrace, lastBrace + 1);
            }

            const parsed = JSON.parse(rawJson);
            return {
              word: parsed.word || query,
              language: parsed.language || targetLang,
              phonetic: parsed.phonetic || null,
              partOfSpeech: parsed.partOfSpeech || "word",
              meaning: parsed.meaning || "Definition found",
              example: parsed.example || null,
              cefrLevel: parsed.cefrLevel || "B1",
              synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
              hindiTranslation: parsed.hindiTranslation || null,
              mnemonic: parsed.mnemonic || null,
              source: "Authoritative Lexicon Engine (OpenRouter AI)",
              sourceUrl: null,
              license: "Open Educational Resource",
              isLocal: false,
              canPersist: true,
            };
          }
        }
      } catch (err: any) {
        console.warn("OpenRouter dictionary lookup fallback failed:", err?.message);
      }
    }

    return null;
  }
}
