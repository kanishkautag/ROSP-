import {
  UnifiedDictionaryService,
  unifiedDictionaryService,
} from "./dictionary/unified_dictionary_service";
import { DictionaryEntry } from "./dictionary/types";

export type { DictionaryEntry } from "./dictionary/types";
export {
  UnifiedDictionaryService,
  unifiedDictionaryService,
} from "./dictionary/unified_dictionary_service";
export { FreeDictionaryProvider } from "./dictionary/free_dictionary_provider";
export { OxfordDictionaryProvider } from "./dictionary/oxford_provider";
export { LocalDatabaseProvider } from "./dictionary/local_provider";
export { GroqLLMDictionaryProvider } from "./dictionary/groq_llm_provider";

export async function lookupWordOnline(
  rawQuery: string,
  preferredLanguage?: string
): Promise<DictionaryEntry | null> {
  return unifiedDictionaryService.lookup(rawQuery, preferredLanguage);
}

export async function saveEntryToVault(entry: {
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
  return unifiedDictionaryService.saveToVault(entry);
}
