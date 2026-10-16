import prisma from "../../packages/db/client";

/**
 * New General Service List (NGSL 1.01) Official Ingestion Script
 *
 * Source: Official New General Service List project
 * Official Site: https://www.newgeneralservicelist.org/
 * Authors: Dr. Charles Browne, Dr. Brent Culligan, Joseph Phillips
 * License: Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)
 *
 * The NGSL is a 2801-word list of the most important high-frequency words for
 * second language learners of English, providing up to 92% coverage of general English texts.
 */

const NGSL_CSV_URL =
  "https://raw.githubusercontent.com/koba-ninkigumi/ngsl/master/NGSL-1.01_en_ja.csv";

interface NgslRow {
  rank: number;
  lemma: string;
  pos: string;
  definition: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function determineCefr(rank: number): "A1" | "A2" | "B1" | "B2" {
  if (rank <= 500) return "A1";
  if (rank <= 1000) return "A2";
  if (rank <= 1800) return "B1";
  return "B2";
}

function assignTopic(lemma: string, pos: string): string {
  const l = lemma.toLowerCase();
  const greetings = new Set([
    "hello", "hi", "welcome", "please", "thank", "thanks", "sorry", "excuse",
    "pardon", "goodbye", "bye", "yes", "no", "okay", "greet", "greeting"
  ]);
  const numbers = new Set([
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "twenty", "thirty", "fifty", "hundred", "thousand", "million",
    "billion", "first", "second", "third", "number", "count", "amount", "total"
  ]);
  const family = new Set([
    "family", "mother", "father", "parent", "brother", "sister", "son", "daughter",
    "child", "children", "baby", "husband", "wife", "marry", "marriage", "relative",
    "uncle", "aunt", "cousin", "friend", "neighbor", "kid"
  ]);
  const food = new Set([
    "food", "eat", "drink", "water", "bread", "meal", "breakfast", "lunch", "dinner",
    "fruit", "vegetable", "meat", "fish", "rice", "tea", "coffee", "milk", "sugar",
    "salt", "cook", "kitchen", "restaurant", "taste", "dish", "plate", "hungry", "delicious"
  ]);
  const travel = new Set([
    "travel", "trip", "tour", "journey", "visit", "go", "arrive", "leave", "stay",
    "car", "bus", "train", "flight", "plane", "airplane", "ship", "boat", "road",
    "street", "station", "airport", "hotel", "map", "ticket", "country", "city",
    "town", "direction", "north", "south", "east", "west", "foreign", "passport"
  ]);
  const college = new Set([
    "school", "college", "university", "study", "student", "teacher", "professor",
    "class", "course", "lesson", "lecture", "learn", "teach", "book", "read",
    "write", "paper", "exam", "test", "grade", "science", "research", "library",
    "degree", "academic", "knowledge", "skill", "subject", "education"
  ]);
  const shopping = new Set([
    "shop", "store", "market", "buy", "sell", "purchase", "pay", "cost", "price",
    "cheap", "expensive", "money", "dollar", "cent", "cash", "bank", "bill",
    "spend", "order", "item", "product", "customer", "sale", "discount"
  ]);

  if (greetings.has(l)) return "greetings";
  if (numbers.has(l)) return "numbers";
  if (family.has(l)) return "family";
  if (food.has(l)) return "food";
  if (travel.has(l)) return "travel";
  if (college.has(l)) return "college";
  if (shopping.has(l)) return "shopping";
  if (pos === "verb") return "common verbs";

  return "daily conversation";
}

export async function importNgslWords(limit?: number) {
  console.log("=== Importing New General Service List (NGSL 1.01) ===");
  console.log(`Source: ${NGSL_CSV_URL}`);
  console.log("Attribution: Dr. Charles Browne, Dr. Brent Culligan, Joseph Phillips (CC BY-SA 4.0)");

  const res = await fetch(NGSL_CSV_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch NGSL CSV: ${res.status} ${res.statusText}`);
  }

  const csvText = await res.text();
  const rawLines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  console.log(`Total CSV lines downloaded: ${rawLines.length}`);

  // Header: Rank,Lemma,POS,Definition,...
  const header = parseCsvLine(rawLines[0]);
  console.log("Header columns:", header);

  const rows: NgslRow[] = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cols = parseCsvLine(rawLines[i]);
    if (cols.length >= 4) {
      const rank = parseInt(cols[0], 10);
      const lemma = cols[1]?.normalize("NFC").trim();
      const pos = cols[2]?.toLowerCase().trim();
      const definition = cols[3]?.normalize("NFC").trim();

      if (rank && lemma && definition) {
        rows.push({ rank, lemma, pos, definition });
      }
    }
  }

  console.log(`Parsed ${rows.length} valid NGSL entries.`);

  const targetRows = limit ? rows.slice(0, limit) : rows;

  // Retrieve existing English words in vault to prevent duplicates
  const existingWords = await prisma.vocabularyWord.findMany({
    where: { language: "en" },
    select: { id: true, word: true },
  });
  const existingMap = new Map<string, string>();
  for (const w of existingWords) {
    existingMap.set(w.word.normalize("NFC").toLowerCase().trim(), w.id);
  }
  console.log(`Existing English words in database: ${existingWords.length}`);

  const toInsert: any[] = [];
  const toUpdate: { id: string; data: any }[] = [];

  for (const item of targetRows) {
    const normalizedWord = item.lemma.normalize("NFC").trim();
    const lookupKey = normalizedWord.toLowerCase();
    const cefr = determineCefr(item.rank);
    const topic = assignTopic(normalizedWord, item.pos);

    const payload = {
      word: normalizedWord,
      language: "en",
      meaning: item.definition,
      partOfSpeech: item.pos || "word",
      cefrLevel: cefr,
      difficulty: cefr,
      frequencyRank: item.rank,
      frequency: Math.max(1, Math.round(10000 / (item.rank + 10))),
      topic,
      source: "New General Service List (NGSL 1.01)",
      sourceUrl: "https://www.newgeneralservicelist.org/",
      license: "CC BY-SA 4.0 (Browne, Culligan, Phillips)",
      pronunciationUrl: null,
    };

    const existingId = existingMap.get(lookupKey);
    if (!existingId) {
      toInsert.push(payload);
      existingMap.set(lookupKey, "pending");
    } else if (existingId !== "pending") {
      toUpdate.push({ id: existingId, data: payload });
    }
  }

  console.log(`New NGSL words to insert: ${toInsert.length}`);
  console.log(`Existing NGSL words to enrich: ${toUpdate.length}`);

  // Batch insert in chunks of 500
  const CHUNK_SIZE = 500;
  for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
    const chunk = toInsert.slice(i, i + CHUNK_SIZE);
    await prisma.vocabularyWord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    console.log(`Inserted chunk ${i + 1} to ${Math.min(i + CHUNK_SIZE, toInsert.length)}...`);
  }

  // Update existing entries with official NGSL rank and attribution
  for (const item of toUpdate) {
    await prisma.vocabularyWord.update({
      where: { id: item.id },
      data: {
        frequencyRank: item.data.frequencyRank,
        source: item.data.source,
        sourceUrl: item.data.sourceUrl,
        license: item.data.license,
      },
    });
  }

  const finalCount = await prisma.vocabularyWord.count({ where: { language: "en" } });
  console.log(`✓ Completed NGSL import. Total English vocabulary in database: ${finalCount}`);
  return { totalImported: toInsert.length, finalCount };
}

// Allow direct execution
if (require.main === module || process.argv[1]?.endsWith("import_ngsl.ts")) {
  importNgslWords()
    .then((res) => {
      console.log("NGSL import script finished successfully:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("NGSL import failed:", err);
      process.exit(1);
    });
}
