export interface DictionaryEntry {
  id?: string;
  word: string;
  language: string;
  phonetic?: string | null;
  audioUrl?: string | null;
  partOfSpeech?: string | null;
  meaning: string;
  example?: string | null;
  cefrLevel?: string | null;
  synonyms?: string[];
  hindiTranslation?: string | null;
  mnemonic?: string | null;
  source: string;
  sourceUrl?: string | null;
  license?: string | null;
  isLocal: boolean;
  canPersist: boolean;
  nativeDefinition?: string | null;
  romanization?: string | null;
  gender?: string | null;
}

export interface IDictionaryProvider {
  readonly name: string;
  isAvailable(): boolean;
  supportsLanguage(language: string): boolean;
  lookup(word: string, language?: string): Promise<DictionaryEntry | null>;
}
