import prisma from "@rosp/db";
import { DictionaryEntry, IDictionaryProvider } from "./types";

/**
 * Local Database Provider
 * Queries PostgreSQL VocabularyWord catalogue first for fast, authoritative, offline-capable results.
 */
export class LocalDatabaseProvider implements IDictionaryProvider {
  readonly name = "Local Database Vault";

  isAvailable(): boolean {
    return true;
  }

  supportsLanguage(): boolean {
    return true;
  }

  async lookup(word: string, language?: string): Promise<DictionaryEntry | null> {
    const cleanWord = word.trim().normalize("NFC");
    if (!cleanWord) return null;

    try {
      const match = await prisma.vocabularyWord.findFirst({
        where: {
          word: {
            equals: cleanWord,
            mode: "insensitive",
          },
          ...(language && language !== "ALL" ? { language } : {}),
        },
      });

      if (!match) return null;

      return {
        id: match.id,
        word: match.word,
        language: match.language,
        partOfSpeech: match.partOfSpeech,
        meaning: match.meaning,
        example: match.example,
        cefrLevel: match.cefrLevel,
        synonyms: match.synonyms || [],
        audioUrl: match.pronunciationUrl,
        nativeDefinition: match.nativeDefinition,
        romanization: match.romanization,
        gender: match.gender,
        source: match.source || "Local Vocabulary Vault",
        sourceUrl: match.sourceUrl,
        license: match.license,
        isLocal: true,
        canPersist: true,
      };
    } catch (dbErr) {
      console.warn("Local DB lookup temporarily unreachable:", dbErr);
      return null;
    }
  }
}
