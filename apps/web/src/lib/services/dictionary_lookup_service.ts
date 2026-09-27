import prisma from "@rosp/db";
import { getLLMConfig } from "../llm/llm_config";

export interface DictionaryEntry {
  id?: string;
  word: string;
  language: string;
  phonetic?: string | null;
  partOfSpeech?: string | null;
  meaning: string;
  example?: string | null;
  cefrLevel?: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | string | null;
  synonyms?: string[];
  hindiTranslation?: string | null;
  mnemonic?: string | null;
  source: string;
  isLocal: boolean;
}

export async function lookupWordOnline(
  rawQuery: string,
  preferredLanguage?: string
): Promise<DictionaryEntry | null> {
  const query = rawQuery.trim();
  if (!query) return null;

  // 1. First check local database
  const localMatch = await prisma.vocabularyWord.findFirst({
    where: {
      word: {
        equals: query,
        mode: "insensitive",
      },
      ...(preferredLanguage && preferredLanguage !== "ALL"
        ? { language: preferredLanguage }
        : {}),
    },
  });

  if (localMatch) {
    return {
      id: localMatch.id,
      word: localMatch.word,
      language: localMatch.language,
      partOfSpeech: localMatch.partOfSpeech,
      meaning: localMatch.meaning,
      example: localMatch.example,
      cefrLevel: localMatch.cefrLevel,
      source: localMatch.source || "Local Vocabulary Vault",
      isLocal: true,
    };
  }

  // 2. Query Groq LLM Oxford/Cambridge Engine
  const config = getLLMConfig();
  if (!config.apiKey) {
    throw new Error("GROQ_API_KEY is not configured for open dictionary lookup");
  }

  const isHindiScript = /[\u0900-\u097F]/.test(query);
  const detectedLang = isHindiScript || preferredLanguage === "hi" ? "hi" : "en";

  const systemPrompt = `You are an authoritative multilingual dictionary engine modeled after Oxford, Cambridge, Collins, and Merriam-Webster lexicons.
Given any query, output a valid JSON object matching this schema exactly:
{
  "word": "canonical dictionary form of the word (correct casing)",
  "language": "${detectedLang}",
  "phonetic": "accurate IPA transcription, e.g. /ˈbʌt.ə.flaɪ/",
  "partOfSpeech": "noun" | "verb" | "adjective" | "adverb" | "idiom" | "phrase",
  "meaning": "Concise, authoritative Oxford-style definition",
  "example": "A natural, high-quality example sentence showcasing the word in context",
  "cefrLevel": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "hindiTranslation": "${detectedLang === "hi" ? "English translation" : "Hindi translation in Devanagari"}",
  "mnemonic": "A short, memorable 1-sentence mnemonic hook or memory trick"
}`;

  const userPrompt = `Define and look up: "${query}" in language "${detectedLang}".`;

  const modelsToTry = [
    config.model || "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
  ];

  let rawJson = "";
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
        signal: AbortSignal.timeout(9000),
      });

      if (res.ok) {
        const data = await res.json();
        rawJson = data.choices?.[0]?.message?.content || "";
        if (rawJson) break;
      }
    } catch (err: any) {
      console.warn(`Dictionary lookup failed with ${model}:`, err?.message);
    }
  }

  if (!rawJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawJson);
    return {
      word: parsed.word || query,
      language: parsed.language || detectedLang,
      phonetic: parsed.phonetic || null,
      partOfSpeech: parsed.partOfSpeech || "word",
      meaning: parsed.meaning || "No definition found",
      example: parsed.example || null,
      cefrLevel: parsed.cefrLevel || "B1",
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms.slice(0, 5) : [],
      hindiTranslation: parsed.hindiTranslation || null,
      mnemonic: parsed.mnemonic || null,
      source: "Oxford & Cambridge Open Lexicon (AI)",
      isLocal: false,
    };
  } catch (parseErr) {
    console.error("Failed to parse dictionary JSON:", parseErr);
    return null;
  }
}

export async function saveEntryToVault(entry: {
  word: string;
  language: string;
  meaning: string;
  example?: string | null;
  partOfSpeech?: string | null;
  cefrLevel?: string | null;
  source?: string | null;
}) {
  // Check if it was already saved
  const existing = await prisma.vocabularyWord.findFirst({
    where: {
      word: { equals: entry.word.trim(), mode: "insensitive" },
      language: entry.language,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.vocabularyWord.create({
    data: {
      word: entry.word.trim(),
      language: entry.language || "en",
      meaning: entry.meaning.trim(),
      example: entry.example?.trim() || null,
      partOfSpeech: entry.partOfSpeech?.trim() || null,
      cefrLevel: entry.cefrLevel || null,
      source: entry.source || "Oxford & Cambridge Open Lexicon",
    },
  });
}
