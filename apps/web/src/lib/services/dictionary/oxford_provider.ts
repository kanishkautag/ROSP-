import { DictionaryEntry, IDictionaryProvider } from "./types";

/**
 * Optional Oxford Dictionaries API Provider (https://developer.oxforddictionaries.com/)
 *
 * Configured via server-side environment variables:
 * - OXFORD_APP_ID
 * - OXFORD_APP_KEY
 *
 * Licensing and Persistence Constraint:
 * In accordance with Oxford Dictionaries API Terms of Service, data retrieved from this
 * provider is licensed for real-time ephemeral display only and CANNOT be persisted
 * to local databases or bulk catalogues (canPersist = false).
 */
export class OxfordDictionaryProvider implements IDictionaryProvider {
  readonly name = "Oxford Dictionaries API";

  private getAppId(): string | undefined {
    return process.env.OXFORD_APP_ID?.trim();
  }

  private getAppKey(): string | undefined {
    return process.env.OXFORD_APP_KEY?.trim();
  }

  isAvailable(): boolean {
    const appId = this.getAppId();
    const appKey = this.getAppKey();
    return Boolean(appId && appKey);
  }

  supportsLanguage(language: string): boolean {
    return !language || language.toLowerCase() === "en";
  }

  async lookup(word: string, language: string = "en"): Promise<DictionaryEntry | null> {
    const appId = this.getAppId();
    const appKey = this.getAppKey();

    if (!appId || !appKey) {
      return null;
    }

    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return null;

    // Oxford API endpoints (sandbox and production fallback)
    const baseUrl = process.env.OXFORD_BASE_URL || "https://od-api-sandbox.oxforddictionaries.com/api/v2";
    const endpoint = `${baseUrl}/entries/en-gb/${encodeURIComponent(cleanWord)}`;

    try {
      const res = await fetch(endpoint, {
        headers: {
          app_id: appId,
          app_key: appKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Word not found in Oxford lexicon
          return null;
        }
        console.warn(`Oxford API returned status ${res.status} for "${cleanWord}"`);
        return null;
      }

      const data = await res.json();
      const results = data.results;
      if (!Array.isArray(results) || results.length === 0) {
        return null;
      }

      const firstResult = results[0];
      const lexicalEntries = Array.isArray(firstResult.lexicalEntries)
        ? firstResult.lexicalEntries
        : [];
      if (lexicalEntries.length === 0) {
        return null;
      }

      const firstLexical = lexicalEntries[0];
      const partOfSpeech =
        firstLexical.lexicalCategory?.text ||
        firstLexical.lexicalCategory?.id ||
        null;

      let phonetic: string | null = null;
      let audioUrl: string | null = null;

      // Check pronunciations
      const pronunciations = Array.isArray(firstLexical.pronunciations)
        ? firstLexical.pronunciations
        : [];
      for (const p of pronunciations) {
        if (!phonetic && p.phoneticSpelling) phonetic = `/${p.phoneticSpelling}/`;
        if (!audioUrl && p.audioFile) audioUrl = p.audioFile;
      }

      // Check entries & senses
      const entries = Array.isArray(firstLexical.entries) ? firstLexical.entries : [];
      let definition: string = "";
      let example: string | null = null;
      const synonyms: string[] = [];

      for (const entry of entries) {
        if (Array.isArray(entry.pronunciations)) {
          for (const p of entry.pronunciations) {
            if (!phonetic && p.phoneticSpelling) phonetic = `/${p.phoneticSpelling}/`;
            if (!audioUrl && p.audioFile) audioUrl = p.audioFile;
          }
        }

        if (Array.isArray(entry.senses)) {
          for (const sense of entry.senses) {
            if (!definition && Array.isArray(sense.definitions) && sense.definitions[0]) {
              definition = sense.definitions[0];
            }
            if (!example && Array.isArray(sense.examples) && sense.examples[0]?.text) {
              example = sense.examples[0].text;
            }
            if (Array.isArray(sense.synonyms)) {
              for (const s of sense.synonyms) {
                if (s.text) synonyms.push(s.text);
              }
            }
          }
        }
      }

      if (!definition) {
        return null;
      }

      return {
        word: firstResult.word || cleanWord,
        language: "en",
        phonetic,
        audioUrl,
        partOfSpeech,
        meaning: definition,
        example,
        cefrLevel: null,
        synonyms: synonyms.slice(0, 5),
        source: "Oxford Dictionaries API (Licensed)",
        sourceUrl: "https://developer.oxforddictionaries.com/",
        license: "Oxford University Press (Licensed, Ephemeral Lookup Only - Do Not Persist)",
        isLocal: false,
        canPersist: false, // Explicitly prevent silent persistence / bulk storing
      };
    } catch (err: any) {
      console.warn(`Oxford API lookup error for "${cleanWord}":`, err?.message || err);
      return null;
    }
  }
}
