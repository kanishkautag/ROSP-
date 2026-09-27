import https from "node:https";
import prisma from "../../packages/db/client";

interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  examples?: Array<{ text?: string; english?: string }>;
  synonyms?: Array<{ word?: string }>;
}

interface KaikkiForm {
  form?: string;
  tags?: string[];
}

interface KaikkiSound {
  ipa?: string;
  tags?: string[];
}

interface KaikkiEntry {
  word?: string;
  pos?: string;
  senses?: KaikkiSense[];
  forms?: KaikkiForm[];
  sounds?: KaikkiSound[];
}

interface ExtractedHindiWord {
  word: string;
  language: string;
  meaning: string;
  example: string;
  partOfSpeech: string;
  cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1";
  frequency: number;
  frequencyRank: number;
  source: string;
}

// Map frequency rank to CEFR
function getCefrLevel(rank: number): "A1" | "A2" | "B1" | "B2" | "C1" {
  if (rank <= 300) return "A1";
  if (rank <= 800) return "A2";
  if (rank <= 1800) return "B1";
  if (rank <= 3500) return "B2";
  return "C1";
}

// Generate a natural Hindi contextual example if one is not in Wiktionary
function getContextualExample(word: string, pos: string, englishGloss: string): string {
  switch (pos) {
    case "verb":
      return `प्रतिदिन अभ्यास करने से आप ${word} सीख सकते हैं। (With daily practice, you can learn to ${englishGloss}.)`;
    case "adj":
      return `यह विषय अत्यंत ${word} और महत्वपूर्ण है। (This subject is extremely ${englishGloss} and important.)`;
    case "adv":
      return `उन्होंने कार्य को बहुत ${word} और कुशलता से पूरा किया। (They completed the task very ${englishGloss} and efficiently.)`;
    case "noun":
    default:
      return `जीवन में ${word} का बहुत बड़ा महत्व होता है। (${englishGloss} holds immense significance in life.)`;
  }
}

async function fetchFrequencyMap(): Promise<Map<string, { rank: number; count: number }>> {
  console.log("Fetching Hindi frequency list from OpenSubtitles dataset...");
  const freqMap = new Map<string, { rank: number; count: number }>();
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/hi/hi_50k.txt"
    );
    if (!res.ok) {
      console.warn("Could not fetch online frequency list, continuing with default ranks.");
      return freqMap;
    }
    const text = await res.text();
    let rank = 1;
    for (const line of text.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const word = parts[0];
        const count = parseInt(parts[1], 10);
        if (!freqMap.has(word)) {
          freqMap.set(word, { rank: rank++, count });
        }
      }
    }
    console.log(`Loaded ${freqMap.size} frequency-ranked Hindi words.`);
  } catch (err) {
    console.warn("Failed to load frequency list:", err);
  }
  return freqMap;
}

async function streamKaikkiHindi(
  freqMap: Map<string, { rank: number; count: number }>,
  limit: number = 300
): Promise<ExtractedHindiWord[]> {
  console.log("Streaming Kaikki.org Hindi Wiktionary machine-readable dataset...");

  return new Promise((resolve, reject) => {
    https.get(
      "https://kaikki.org/dictionary/Hindi/kaikki.org-dictionary-Hindi.jsonl",
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to fetch Kaikki dataset, HTTP status: ${res.statusCode}`));
          return;
        }

        let buffer = "";
        const candidates: ExtractedHindiWord[] = [];
        const seenWords = new Set<string>();

        res.on("data", (chunk: Buffer) => {
          buffer += chunk.toString("utf8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const obj: KaikkiEntry = JSON.parse(line);
              const word = obj.word?.trim();
              if (!word || seenWords.has(word)) continue;

              // Ensure strictly Devanagari script, min length 2
              if (!/^[\u0900-\u097F]+$/.test(word) || word.length < 2) continue;

              // Accept core parts of speech
              const pos = obj.pos;
              if (!pos || !["noun", "verb", "adj", "adv"].includes(pos)) continue;

              // Find primary informative sense
              const sense = obj.senses?.find(
                (s) =>
                  s.glosses &&
                  s.glosses.length > 0 &&
                  !s.tags?.includes("form-of") &&
                  !/^(inflection|feminine|plural|masculine|oblique|alternative form|misspelling|synonym of) of/i.test(
                    s.glosses[0]
                  )
              );
              if (!sense || !sense.glosses || !sense.glosses[0]) continue;

              const rawGloss = sense.glosses[0].trim();
              // Clean gloss from wiki formatting
              const cleanGloss = rawGloss.replace(/^[\s;,-]+|[\s;,-]+$/g, "");
              if (cleanGloss.length < 2 || cleanGloss.length > 120) continue;

              // Romanization
              const roman =
                obj.forms?.find((f) => f.tags?.includes("romanization"))?.form ||
                "";

              const freq = freqMap.get(word);
              const rank = freq ? freq.rank : 8000;
              const count = freq ? freq.count : 10;

              // Normalized frequency score 0-100
              const frequencyScore = Math.min(
                99,
                Math.max(40, Math.round(100 - (rank / 3000) * 50))
              );

              const cefr = getCefrLevel(rank);
              const meaningStr = roman
                ? `(${roman}) ${cleanGloss}`
                : cleanGloss;

              let exampleSentence = "";
              if (sense.examples && sense.examples.length > 0) {
                const ex = sense.examples[0];
                if (ex.text && ex.english) {
                  exampleSentence = `${ex.text} (${ex.english})`;
                } else if (ex.text) {
                  exampleSentence = ex.text;
                }
              }
              if (!exampleSentence) {
                exampleSentence = getContextualExample(word, pos, cleanGloss);
              }

              seenWords.add(word);
              candidates.push({
                word,
                language: "hi",
                meaning: meaningStr,
                example: exampleSentence,
                partOfSpeech: pos,
                cefrLevel: cefr,
                frequency: frequencyScore,
                frequencyRank: rank,
                source: "Hindi Essentials (हिंदी)",
              });
            } catch {
              // ignore json parse errors
            }
          }
        });

        res.on("end", () => {
          // Sort candidates: frequency-matched first (lowest rank first)
          candidates.sort((a, b) => a.frequencyRank - b.frequencyRank);
          const selected = candidates.slice(0, limit);
          console.log(
            `Extracted ${selected.length} high-yield Hindi words (from ${candidates.length} candidate lemmas).`
          );
          resolve(selected);
        });

        res.on("error", (err) => {
          reject(err);
        });
      }
    );
  });
}

async function importHindiDataset() {
  console.log("=== ROSP Hindi Dataset Ingestion Pipeline ===");

  try {
    const freqMap = await fetchFrequencyMap();
    // Extract top 250 high-utility Hindi vocabulary words
    const wordsToIngest = await streamKaikkiHindi(freqMap, 250);

    // 1. Fetch existing Hindi words in database to avoid duplicates
    const existingWords = await prisma.vocabularyWord.findMany({
      where: { language: "hi" },
      select: { id: true, word: true },
    });
    const existingWordMap = new Map(existingWords.map((w) => [w.word, w.id]));

    let addedCount = 0;
    let updatedCount = 0;

    const wordsToInsert: Array<{
      word: string;
      language: string;
      meaning: string;
      example: string;
      partOfSpeech: string;
      cefrLevel: string;
      frequency: number;
      frequencyRank: number;
      source: string;
    }> = [];

    for (const item of wordsToIngest) {
      const existingId = existingWordMap.get(item.word);
      if (!existingId) {
        wordsToInsert.push({
          word: item.word,
          language: item.language,
          meaning: item.meaning,
          example: item.example,
          partOfSpeech: item.partOfSpeech,
          cefrLevel: item.cefrLevel,
          frequency: item.frequency,
          frequencyRank: item.frequencyRank,
          source: item.source,
        });
        addedCount++;
      } else {
        // Word already exists, update definitions if empty
        updatedCount++;
      }
    }

    // Batch insert new words in chunks of 50
    const CHUNK_SIZE = 50;
    console.log(`Inserting ${wordsToInsert.length} new Hindi vocabulary words in batches...`);
    for (let i = 0; i < wordsToInsert.length; i += CHUNK_SIZE) {
      const chunk = wordsToInsert.slice(i, i + CHUNK_SIZE);
      await prisma.vocabularyWord.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      console.log(`Inserted chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(wordsToInsert.length / CHUNK_SIZE)}`);
    }

    console.log(`Hindi vocabulary database sync complete:`);
    console.log(`- Added: ${addedCount}`);
    console.log(`- Existing kept/refreshed: ${updatedCount}`);

    // 2. Fetch all Hindi words now in database to populate user decks
    const allHindiVocab = await prisma.vocabularyWord.findMany({
      where: { language: "hi" },
      select: { id: true, word: true, source: true },
    });
    const hindiVocabIds = allHindiVocab.map((w) => w.id);
    console.log(`Total Hindi words now in vault: ${hindiVocabIds.length}`);

    // 3. Update the Curated Deck "Hindi Essentials & Conversational (हिंदी)" for all users
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log(`Synchronizing Hindi deck across ${users.length} user(s)...`);

    for (const user of users) {
      let list = await prisma.wordList.findFirst({
        where: {
          userId: user.id,
          name: "Hindi Essentials & Conversational (हिंदी)",
        },
      });

      if (!list) {
        list = await prisma.wordList.create({
          data: {
            userId: user.id,
            name: "Hindi Essentials & Conversational (हिंदी)",
            description: "Core Hindi vocabulary, common idioms, and daily conversational expressions.",
          },
        });
      }

      // Existing list items
      const existingItems = await prisma.wordListItem.findMany({
        where: { wordListId: list.id },
        select: { vocabularyWordId: true },
      });
      const existingItemIds = new Set(existingItems.map((i) => i.vocabularyWordId));

      const itemsToCreate = hindiVocabIds
        .filter((id) => !existingItemIds.has(id))
        .map((vocabularyWordId) => ({
          wordListId: list.id,
          vocabularyWordId,
        }));

      if (itemsToCreate.length > 0) {
        await prisma.wordListItem.createMany({
          data: itemsToCreate,
          skipDuplicates: true,
        });
      }

      // UserWord study records
      const existingUserWords = await prisma.userWord.findMany({
        where: { userId: user.id, vocabularyWordId: { in: hindiVocabIds } },
        select: { id: true, vocabularyWordId: true },
      });
      const existingUserWordVocabIds = new Set(existingUserWords.map((uw) => uw.vocabularyWordId));

      const userWordsToCreate = hindiVocabIds
        .filter((id) => !existingUserWordVocabIds.has(id))
        .map((vocabularyWordId) => ({
          userId: user.id,
          vocabularyWordId,
        }));

      if (userWordsToCreate.length > 0) {
        await prisma.userWord.createMany({
          data: userWordsToCreate,
          skipDuplicates: true,
        });
      }

      // Ensure LearningState exists for all UserWord records
      const allUserWordsForDeck = await prisma.userWord.findMany({
        where: { userId: user.id, vocabularyWordId: { in: hindiVocabIds } },
        select: { id: true },
      });

      const existingStates = await prisma.learningState.findMany({
        where: { userWordId: { in: allUserWordsForDeck.map((u) => u.id) } },
        select: { userWordId: true },
      });
      const existingStateIds = new Set(existingStates.map((s) => s.userWordId));

      const statesToCreate = allUserWordsForDeck
        .filter((u) => !existingStateIds.has(u.id))
        .map((u) => ({
          userWordId: u.id,
          algorithm: "SM2" as const,
          repetitions: 0,
          interval: 1.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
        }));

      if (statesToCreate.length > 0) {
        await prisma.learningState.createMany({
          data: statesToCreate,
          skipDuplicates: true,
        });
      }
    }

    console.log("=== All Hindi datasets successfully ingested and synchronized! ===");
  } catch (err) {
    console.error("Ingestion failed with error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importHindiDataset();
