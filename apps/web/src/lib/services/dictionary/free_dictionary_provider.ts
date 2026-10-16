import { DictionaryEntry, IDictionaryProvider } from "./types";

/**
 * Free Dictionary API Provider (https://dictionaryapi.dev/)
 * Retrieves word definitions, phonetics, audio pronunciations, examples, synonyms,
 * and Wiktionary CC BY-SA 3.0 licensing metadata.
 */
export class FreeDictionaryProvider implements IDictionaryProvider {
  readonly name = "Free Dictionary API";

  isAvailable(): boolean {
    return true;
  }

  supportsLanguage(language: string): boolean {
    return !language || language.toLowerCase() === "en";
  }

  async lookup(word: string, language: string = "en"): Promise<DictionaryEntry | null> {
    const cleanWord = word.trim().toLowerCase();
    if (!cleanWord) return null;

    try {
      const endpoint = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`;
      const res = await fetch(endpoint, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4500),
      });

      if (!res.ok) {
        if (res.status === 404) {
          // Word not found in Free Dictionary
          return null;
        }
        console.warn(`Free Dictionary API returned status ${res.status} for "${cleanWord}"`);
        return null;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        return null;
      }

      const firstEntry = data[0];
      const phoneticsList: any[] = Array.isArray(firstEntry.phonetics) ? firstEntry.phonetics : [];

      // Extract phonetic text (e.g., "/həˈloʊ/")
      let phoneticText = firstEntry.phonetic || null;
      if (!phoneticText && phoneticsList.length > 0) {
        const found = phoneticsList.find((p) => typeof p.text === "string" && p.text.trim());
        if (found) phoneticText = found.text.trim();
      }

      // Extract high-quality audio URL (.mp3 or .wav)
      let audioUrl: string | null = null;
      for (const p of phoneticsList) {
        if (typeof p.audio === "string" && p.audio.trim().length > 0) {
          audioUrl = p.audio.trim();
          break;
        }
      }

      // Extract meanings, definitions, part of speech, and examples
      const meanings: any[] = Array.isArray(firstEntry.meanings) ? firstEntry.meanings : [];
      let partOfSpeech: string | null = null;
      let primaryMeaning: string = "";
      let primaryExample: string | null = null;
      const synonymsSet = new Set<string>();

      for (const m of meanings) {
        if (!partOfSpeech && m.partOfSpeech) {
          partOfSpeech = m.partOfSpeech;
        }

        if (Array.isArray(m.synonyms)) {
          for (const s of m.synonyms) {
            if (typeof s === "string" && s.trim()) synonymsSet.add(s.trim());
          }
        }

        if (Array.isArray(m.definitions)) {
          for (const d of m.definitions) {
            if (!primaryMeaning && typeof d.definition === "string" && d.definition.trim()) {
              primaryMeaning = d.definition.trim();
            }
            if (!primaryExample && typeof d.example === "string" && d.example.trim()) {
              primaryExample = d.example.trim();
            }
            if (Array.isArray(d.synonyms)) {
              for (const s of d.synonyms) {
                if (typeof s === "string" && s.trim()) synonymsSet.add(s.trim());
              }
            }
          }
        }
      }

      if (!primaryMeaning) {
        return null;
      }

      const licenseName = firstEntry.license?.name || "CC BY-SA 3.0 (Wiktionary)";
      const sourceUrl =
        (Array.isArray(firstEntry.sourceUrls) && firstEntry.sourceUrls[0]) ||
        "https://dictionaryapi.dev/";

      return {
        word: firstEntry.word || cleanWord,
        language: "en",
        phonetic: phoneticText,
        audioUrl,
        partOfSpeech: partOfSpeech || "word",
        meaning: primaryMeaning,
        example: primaryExample,
        cefrLevel: null,
        synonyms: Array.from(synonymsSet).slice(0, 6),
        source: "Free Dictionary API (Wiktionary)",
        sourceUrl,
        license: licenseName,
        isLocal: false,
        canPersist: true,
      };
    } catch (err: any) {
      console.warn(`Free Dictionary API lookup failed for "${cleanWord}":`, err?.message || err);
      return null;
    }
  }
}
