import JSZip from "jszip";
import { AnkiCard } from "@rosp/shared";

/**
 * Strips HTML markup common in Anki cards (e.g. <b>, <br>, [sound:...])
 */
function cleanAnkiText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/\[sound:[^\]]*\]/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses CSV or TSV text content into AnkiCard array.
 */
export function parseDelimitedText(content: string, delimiter?: string): AnkiCard[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Auto-detect delimiter if not specified
  const firstLine = lines[0];
  const delim = delimiter || (firstLine.includes("\t") ? "\t" : ",");

  const cards: AnkiCard[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comment lines starting with #
    if (line.startsWith("#")) continue;

    // Basic CSV/TSV splitting supporting quoted strings
    const parts = line.split(delim).map((p) => p.replace(/^"|"$/g, "").trim());
    if (parts.length < 2) continue;

    const word = cleanAnkiText(parts[0]);
    const meaning = cleanAnkiText(parts[1]);
    const example = parts[2] ? cleanAnkiText(parts[2]) : null;
    const extra = parts[3] ? cleanAnkiText(parts[3]) : null;

    if (!word || !meaning) continue;

    // Check if extra contains a CEFR level (A1-C2)
    const cefrMatch = extra?.match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
    const cefrLevel = cefrMatch ? (cefrMatch[1].toUpperCase() as "A1" | "A2" | "B1" | "B2" | "C1" | "C2") : null;

    cards.push({
      word,
      meaning,
      example: example || undefined,
      partOfSpeech: extra && !cefrMatch ? extra : undefined,
      cefrLevel: cefrLevel || undefined,
    });
  }

  return cards;
}

/**
 * Parses .apkg (Anki package) binary buffer.
 * Anki .apkg files are ZIP containers containing notes with \x1f field separators.
 */
export async function parseAnkiPackage(buffer: ArrayBuffer): Promise<AnkiCard[]> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const collectionFile = zip.file("collection.anki2") || zip.file("collection.anki21");

    if (!collectionFile) {
      // Fallback: check if there are text or media files
      for (const filename of Object.keys(zip.files)) {
        if (filename.endsWith(".txt") || filename.endsWith(".csv") || filename.endsWith(".tsv")) {
          const content = await zip.files[filename].async("text");
          const cards = parseDelimitedText(content);
          if (cards.length > 0) return cards;
        }
      }
      throw new Error("No valid collection database or text files found in .apkg archive");
    }

    const sqliteBuffer = await collectionFile.async("uint8array");
    const textDecoder = new TextDecoder("utf-8", { fatal: false });
    const rawText = textDecoder.decode(sqliteBuffer);

    // In Anki collection SQLite databases, notes fields are stored concatenated with \x1f (unit separator 31)
    const notesRegex = /([^\x00-\x1e\x7f-\x9f]{2,80})\x1f([^\x00-\x1e\x7f-\x9f]{2,200})/g;
    const cards: AnkiCard[] = [];
    const seenWords = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = notesRegex.exec(rawText)) !== null) {
      const rawFront = cleanAnkiText(match[1]);
      const rawBack = cleanAnkiText(match[2]);

      // Filter out non-dictionary binary noise or schema markers
      if (
        rawFront.length >= 2 &&
        rawFront.length <= 60 &&
        rawBack.length >= 2 &&
        !rawFront.includes("{") &&
        !rawFront.includes("table") &&
        !seenWords.has(rawFront.toLowerCase())
      ) {
        seenWords.add(rawFront.toLowerCase());
        cards.push({
          word: rawFront,
          meaning: rawBack,
        });
      }

      if (cards.length >= 100) break; // Limit preview batch
    }

    if (cards.length === 0) {
      throw new Error("Could not parse flashcard fields from this .apkg file");
    }

    return cards;
  } catch (err: any) {
    throw new Error(err?.message || "Failed to unpack Anki .apkg archive");
  }
}
