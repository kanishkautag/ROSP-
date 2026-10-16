import prisma from "@rosp/db";
import { DictionaryEntry, IDictionaryProvider } from "./types";
import { LocalDatabaseProvider } from "./local_provider";
import { FreeDictionaryProvider } from "./free_dictionary_provider";
import { OxfordDictionaryProvider } from "./oxford_provider";
import { GroqLLMDictionaryProvider } from "./groq_llm_provider";

export class UnifiedDictionaryService {
  private localProvider: LocalDatabaseProvider;
  private oxfordProvider: OxfordDictionaryProvider;
  private freeDictProvider: FreeDictionaryProvider;
  private groqProvider: GroqLLMDictionaryProvider;

  constructor() {
    this.localProvider = new LocalDatabaseProvider();
    this.oxfordProvider = new OxfordDictionaryProvider();
    this.freeDictProvider = new FreeDictionaryProvider();
    this.groqProvider = new GroqLLMDictionaryProvider();
  }

  /**
   * Unified lookup across providers:
   * 1. Check local PostgreSQL catalogue first (fastest, offline-capable).
   * 2. If English:
   *    a. If OXFORD_APP_ID/OXFORD_APP_KEY configured -> Oxford provider (canPersist: false).
   *    b. Free Dictionary API (dictionaryapi.dev) with audio & phonetics.
   *    c. Groq AI dictionary engine fallback.
   * 3. If Hindi or Marathi:
   *    a. Local database.
   *    b. Groq AI Indic dictionary engine.
   */
  async lookup(rawQuery: string, preferredLanguage?: string): Promise<DictionaryEntry | null> {
    const query = rawQuery ? rawQuery.trim().normalize("NFC") : "";
    if (!query) return null;

    // 1. Local Database first
    const localResult = await this.localProvider.lookup(query, preferredLanguage);
    if (localResult) {
      return localResult;
    }

    const isDevanagari = /[\u0900-\u097F]/.test(query);
    const lang = preferredLanguage && preferredLanguage !== "ALL"
      ? preferredLanguage
      : isDevanagari
      ? "hi"
      : "en";

    // 2. English Dictionary Resolution Chain
    if (lang === "en") {
      // 2a. Oxford Dictionary (if credentials configured)
      if (this.oxfordProvider.isAvailable()) {
        const oxfordResult = await this.oxfordProvider.lookup(query, lang);
        if (oxfordResult) return oxfordResult;
      }

      // 2b. Free Dictionary API
      const freeDictResult = await this.freeDictProvider.lookup(query, lang);
      if (freeDictResult) return freeDictResult;

      // 2c. Fallback AI Lexicon Engine
      if (this.groqProvider.isAvailable()) {
        const groqResult = await this.groqProvider.lookup(query, lang);
        if (groqResult) return groqResult;
      }

      return null;
    }

    // 3. Indic Dictionary Resolution Chain (hi, mr)
    if (this.groqProvider.isAvailable()) {
      const groqResult = await this.groqProvider.lookup(query, lang);
      if (groqResult) return groqResult;
    }

    return null;
  }

  /**
   * Save a discovered dictionary entry to the global database catalogue.
   * Respects licensing: Rejects entries from providers that prohibit bulk persistence (such as Oxford).
   */
  async saveToVault(entry: {
    word: string;
    language: string;
    meaning: string;
    example?: string | null;
    partOfSpeech?: string | null;
    cefrLevel?: string | null;
    source?: string | null;
    canPersist?: boolean;
    audioUrl?: string | null;
  }) {
    // Strict licensing enforcement: Do not persist restricted data
    if (entry.canPersist === false) {
      throw new Error(
        "Licensing Restriction: This entry is from a provider that does not permit persistent database storage."
      );
    }

    const cleanWord = entry.word.trim().normalize("NFC");
    const lang = entry.language || "en";

    // Check if word already exists in vault
    const existing = await prisma.vocabularyWord.findFirst({
      where: {
        word: { equals: cleanWord, mode: "insensitive" },
        language: lang,
      },
    });

    if (existing) {
      return existing;
    }

    return prisma.vocabularyWord.create({
      data: {
        word: cleanWord,
        language: lang,
        meaning: entry.meaning.trim(),
        example: entry.example?.trim() || null,
        partOfSpeech: entry.partOfSpeech?.trim() || null,
        cefrLevel: entry.cefrLevel || null,
        pronunciationUrl: entry.audioUrl || null,
        source: entry.source || "User Discovered Entry",
        license: "CC BY-SA",
      },
    });
  }

  /**
   * Add a word to a user's personal list without silently polluting the global catalogue.
   * If the word is from a restricted provider or user-created, it is scoped as a personal word
   * so that global catalogue searches remain clean and unpolluted.
   */
  async addWordToPersonalList(
    userId: string,
    listId: string,
    wordData: {
      vocabularyWordId?: string;
      word?: string;
      meaning?: string;
      example?: string;
      partOfSpeech?: string;
      cefrLevel?: string;
      language?: string;
      canPersist?: boolean;
      source?: string;
    }
  ) {
    const list = await prisma.wordList.findFirst({
      where: { id: listId, userId },
    });

    if (!list) {
      throw new Error("Target word list not found or unauthorized");
    }

    let vocabWordId = wordData.vocabularyWordId;

    if (!vocabWordId && wordData.word && wordData.meaning) {
      const cleanWord = wordData.word.trim().normalize("NFC");
      const lang = wordData.language || "en";

      // Check if it already exists in the global vocabulary table
      let vocab = await prisma.vocabularyWord.findFirst({
        where: {
          word: { equals: cleanWord, mode: "insensitive" },
          language: lang,
        },
      });

      if (!vocab) {
        // Tag personal user additions to prevent polluting official global curricula
        const isRestrictedOrCustom = wordData.canPersist === false;
        vocab = await prisma.vocabularyWord.create({
          data: {
            word: cleanWord,
            language: lang,
            meaning: wordData.meaning.trim(),
            example: wordData.example?.trim() || null,
            partOfSpeech: wordData.partOfSpeech || "noun",
            cefrLevel: wordData.cefrLevel || "B2",
            source: isRestrictedOrCustom
              ? "user_personal_ephemeral"
              : wordData.source || "user_personal",
            license: isRestrictedOrCustom ? "Personal Study License" : "User Added",
          },
        });
      }

      vocabWordId = vocab.id;
    }

    if (!vocabWordId) {
      throw new Error("vocabularyWordId or word+meaning is required");
    }

    // Connect to personal word list
    const listItem = await prisma.wordListItem.upsert({
      where: {
        wordListId_vocabularyWordId: {
          wordListId: listId,
          vocabularyWordId: vocabWordId,
        },
      },
      update: {},
      create: {
        wordListId: listId,
        vocabularyWordId: vocabWordId,
      },
      include: {
        vocabularyWord: true,
      },
    });

    // Register user word & spaced repetition learning state
    const userWord = await prisma.userWord.upsert({
      where: {
        userId_vocabularyWordId: {
          userId,
          vocabularyWordId: vocabWordId,
        },
      },
      update: {},
      create: {
        userId,
        vocabularyWordId: vocabWordId,
      },
    });

    await prisma.learningState.upsert({
      where: { userWordId: userWord.id },
      update: {},
      create: {
        userWordId: userWord.id,
        algorithm: "SM2",
        repetitions: 0,
        interval: 1.0,
        easeFactor: 2.5,
        nextReviewAt: new Date(),
      },
    });

    return listItem;
  }
}

// Singleton instance
export const unifiedDictionaryService = new UnifiedDictionaryService();
