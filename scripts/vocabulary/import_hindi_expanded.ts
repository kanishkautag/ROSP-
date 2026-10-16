import https from "https";
import readline from "readline";
import prisma from "../../packages/db/client";

interface KaikkiSense {
  glosses?: string[];
  tags?: string[];
  examples?: Array<{ text?: string; english?: string }>;
}

interface KaikkiForm {
  form?: string;
  tags?: string[];
  roman?: string;
}

interface KaikkiSound {
  ipa?: string;
  mp3_url?: string;
  ogg_url?: string;
}

interface KaikkiHeadTemplate {
  name?: string;
  args?: Record<string, string>;
  expansion?: string;
}

interface KaikkiEntry {
  word?: string;
  pos?: string;
  senses?: KaikkiSense[];
  forms?: KaikkiForm[];
  sounds?: KaikkiSound[];
  head_templates?: KaikkiHeadTemplate[];
  tags?: string[];
}

// Topic classification by English gloss keywords
function classifyTopic(gloss: string, pos: string): string {
  const g = gloss.toLowerCase();
  if (/\b(hello|greet|greeting|welcome|thank|please|good morning|good night|goodbye|farewell|peace)\b/.test(g)) {
    return "greetings";
  }
  if (/\b(mother|father|brother|sister|son|daughter|family|parent|uncle|aunt|cousin|child|wife|husband|grandfather|grandmother|sibling|relative|clan)\b/.test(g)) {
    return "family";
  }
  if (/\b(food|eat|drink|water|bread|rice|fruit|vegetable|milk|tea|coffee|meal|cook|sugar|salt|sweet|curry|wheat|grain|apple|banana|mango|meat|egg|taste|hunger)\b/.test(g)) {
    return "food";
  }
  if (/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand|first|second|number|count|quantity|both)\b/.test(g)) {
    return "numbers";
  }
  if (pos === "verb" && /\b(go|come|do|make|see|look|hear|speak|say|tell|walk|run|give|take|know|think|sleep|sit|stand|eat|drink|write|read|work|laugh|live)\b/.test(g)) {
    return "common verbs";
  }
  if (/\b(travel|road|path|journey|car|bus|train|vehicle|station|ticket|city|village|country|map|direction|north|south|east|west|river|mountain|sea|place|world)\b/.test(g)) {
    return "travel";
  }
  if (/\b(shop|market|buy|sell|price|cost|money|rupee|coin|pay|cloth|clothes|store|merchant|trade|commerce|business|wealth)\b/.test(g)) {
    return "shopping";
  }
  if (/\b(school|college|university|student|teacher|study|learn|book|pen|exam|lesson|education|knowledge|science|history|paper|class|read|write)\b/.test(g)) {
    return "college";
  }
  if (/\b(happy|sad|joy|sorrow|anger|angry|fear|love|hope|pain|feeling|emotion|pleasure|grief|peace|laugh|cry|worry|heart|soul)\b/.test(g)) {
    return "emotions";
  }
  if (pos === "verb") {
    return "common verbs";
  }
  return "daily conversation";
}

// Assign progression difficulty
function assignDifficulty(topic: string, rank: number, pos: string): { cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1"; difficulty: string } {
  if (topic === "greetings" || topic === "numbers" || (topic === "family" && rank <= 500)) {
    return { cefrLevel: "A1", difficulty: "A1 - Beginner" };
  }
  if (rank <= 350) {
    return { cefrLevel: "A1", difficulty: "A1 - Beginner" };
  }
  if (rank <= 900) {
    return { cefrLevel: "A2", difficulty: "A2 - Elementary" };
  }
  if (rank <= 1800) {
    return { cefrLevel: "B1", difficulty: "B1 - Intermediate" };
  }
  if (rank <= 2800) {
    return { cefrLevel: "B2", difficulty: "B2 - Upper Intermediate" };
  }
  return { cefrLevel: "C1", difficulty: "C1 - Advanced" };
}

function generateHindiExample(word: string, pos: string, englishGloss: string, topic: string): { example: string; exampleTranslation: string } {
  switch (pos) {
    case "verb":
      return {
        example: `प्रतिदिन अभ्यास करने से आप अच्छी तरह ${word} सीख सकते हैं।`,
        exampleTranslation: `With daily practice, you can learn to ${englishGloss} well.`,
      };
    case "adj":
      return {
        example: `यह विषय अत्यंत ${word} और महत्वपूर्ण है।`,
        exampleTranslation: `This subject is extremely ${englishGloss} and important.`,
      };
    case "adv":
      return {
        example: `उन्होंने कार्य को बहुत ${word} और कुशलता से पूरा किया।`,
        exampleTranslation: `They completed the task very ${englishGloss} and efficiently.`,
      };
    case "noun":
    default:
      if (topic === "food") {
        return {
          example: `ताजा और पौष्टिक ${word} स्वास्थ्य के लिए लाभदायक होता है।`,
          exampleTranslation: `Fresh and nutritious ${englishGloss} is beneficial for health.`,
        };
      }
      if (topic === "family") {
        return {
          example: `परिवार में ${word} का सम्मान हमेशा करना चाहिए।`,
          exampleTranslation: `One should always respect one's ${englishGloss} in the family.`,
        };
      }
      return {
        example: `हमारे दैनिक जीवन में ${word} का बहुत बड़ा महत्व है।`,
        exampleTranslation: `${englishGloss} holds great significance in our daily life.`,
      };
  }
}

async function fetchFrequencyMap(): Promise<Map<string, { rank: number; count: number }>> {
  console.log("Fetching Hindi frequency rankings (OpenSubtitles 2016)...");
  const freqMap = new Map<string, { rank: number; count: number }>();
  try {
    const res = await fetch("https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/hi/hi_50k.txt");
    if (!res.ok) {
      console.warn("Could not fetch online frequency list, falling back to sequential ranking.");
      return freqMap;
    }
    const text = await res.text();
    let rank = 1;
    for (const line of text.split("\n")) {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 2) {
        const word = parts[0].normalize("NFC");
        const count = parseInt(parts[1], 10);
        if (!freqMap.has(word)) {
          freqMap.set(word, { rank: rank++, count });
        }
      }
    }
    console.log(`Loaded ${freqMap.size} frequency-ranked Hindi words.`);
  } catch (e: any) {
    console.warn("Frequency fetch error:", e.message);
  }
  return freqMap;
}

export async function importExpandedHindi(targetTotal: number = 2100) {
  console.log("==================================================");
  console.log("   EXPANDING HINDI VOCABULARY (हिंदी)             ");
  console.log("==================================================");

  const freqMap = await fetchFrequencyMap();

  // 1. Fetch existing Hindi words in DB
  const existing = await prisma.vocabularyWord.findMany({
    where: { language: "hi" },
    select: { id: true, word: true, meaning: true },
  });
  const existingWords = new Set(existing.map((w) => w.word.normalize("NFC").trim()));
  console.log(`Current Hindi words in database: ${existing.length}`);

  const candidates: Array<{
    word: string;
    language: string;
    meaning: string;
    romanization: string | null;
    gender: string | null;
    forms: string | null;
    partOfSpeech: string;
    topic: string;
    cefrLevel: string;
    difficulty: string;
    frequency: number;
    frequencyRank: number;
    example: string;
    exampleTranslation: string;
    pronunciationUrl: string | null;
    source: string;
    sourceUrl: string;
    license: string;
  }> = [];

  const devanagariRegex = /^[\u0900-\u097F]+$/;

  await new Promise<void>((resolve, reject) => {
    https.get("https://kaikki.org/dictionary/Hindi/kaikki.org-dictionary-Hindi.jsonl", (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download Kaikki Hindi, status: ${res.statusCode}`));
      }

      const rl = readline.createInterface({ input: res, crlfDelay: Infinity });

      let unrankedCounter = 3500;

      rl.on("line", (line) => {
        if (!line.trim()) return;
        try {
          const entry: KaikkiEntry = JSON.parse(line);
          const rawWord = entry.word?.trim();
          if (!rawWord) return;
          const word = rawWord.normalize("NFC");

          if (existingWords.has(word)) return;
          if (!devanagariRegex.test(word) || word.length < 2) return;

          const pos = entry.pos;
          if (!pos || !["noun", "verb", "adj", "adv"].includes(pos)) return;

          // Find informative sense
          const sense = entry.senses?.find(
            (s) =>
              s.glosses &&
              s.glosses.length > 0 &&
              !s.tags?.includes("form-of") &&
              !/^(inflection|feminine|plural|masculine|oblique|alternative form|misspelling|synonym of) of/i.test(
                s.glosses[0]
              )
          );
          if (!sense || !sense.glosses?.[0]) return;

          const cleanGloss = sense.glosses[0].trim().replace(/^[\s;,-]+|[\s;,-]+$/g, "");
          if (cleanGloss.length < 2 || cleanGloss.length > 150) return;

          // Gender extraction (masculine / feminine for Hindi)
          let gender: string | null = null;
          const headArgs = entry.head_templates?.[0]?.args;
          if (headArgs) {
            if (headArgs["1"] === "m" || headArgs.g === "m") gender = "masculine";
            else if (headArgs["1"] === "f" || headArgs.g === "f") gender = "feminine";
          }
          if (!gender) {
            for (const s of entry.senses || []) {
              if (s.tags?.includes("masculine")) { gender = "masculine"; break; }
              if (s.tags?.includes("feminine")) { gender = "feminine"; break; }
            }
          }
          if (!gender && entry.tags) {
            if (entry.tags.includes("masculine")) gender = "masculine";
            else if (entry.tags.includes("feminine")) gender = "feminine";
          }

          // Romanization
          const roman = entry.forms?.find((f) => f.tags?.includes("romanization"))?.form || null;

          // Urdu cognate or alternative forms
          const urdu = entry.forms?.find((f) => f.tags?.includes("Urdu"))?.form;
          const forms = urdu ? `Urdu: ${urdu}` : null;

          // Audio
          const pronunciationUrl = entry.sounds?.[0]?.mp3_url || entry.sounds?.[0]?.ogg_url || null;

          // Frequency & Rank
          const freqInfo = freqMap.get(word);
          const rank = freqInfo ? freqInfo.rank : unrankedCounter++;
          const frequencyScore = Math.max(30, Math.round(98 - (rank / 3500) * 55));

          // Topic & Progression
          const topic = classifyTopic(cleanGloss, pos);
          const { cefrLevel, difficulty } = assignDifficulty(topic, rank, pos);

          // Example
          let exampleText = "";
          let exampleTranslation = "";
          if (sense.examples && sense.examples.length > 0 && sense.examples[0].text) {
            exampleText = sense.examples[0].text;
            exampleTranslation = sense.examples[0].english || "";
          }
          if (!exampleText) {
            const gen = generateHindiExample(word, pos, cleanGloss, topic);
            exampleText = gen.example;
            exampleTranslation = gen.exampleTranslation;
          }

          existingWords.add(word);
          candidates.push({
            word,
            language: "hi",
            meaning: cleanGloss,
            romanization: roman,
            gender,
            forms,
            partOfSpeech: pos,
            topic,
            cefrLevel,
            difficulty,
            frequency: frequencyScore,
            frequencyRank: rank,
            example: exampleText,
            exampleTranslation,
            pronunciationUrl,
            source: "Wiktionary Hindi / Kaikki / OpenSubtitles / AI4Bharat",
            sourceUrl: "https://kaikki.org/dictionary/Hindi/",
            license: "CC-BY-SA 3.0 / 4.0 / CC0",
          });

          if (existing.length + candidates.length >= targetTotal) {
            rl.close();
            res.destroy();
          }
        } catch {}
      });

      rl.on("close", () => resolve());
      res.on("error", (e) => {
        if (existing.length + candidates.length >= targetTotal) resolve();
        else reject(e);
      });
    }).on("error", reject);
  });

  // Sort candidates by frequency rank so the most useful everyday words come first!
  candidates.sort((a, b) => a.frequencyRank - b.frequencyRank);

  console.log(`Prepared ${candidates.length} new high-quality Hindi vocabulary entries.`);

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const chunk = candidates.slice(i, i + BATCH_SIZE);
    await prisma.vocabularyWord.createMany({
      data: chunk,
      skipDuplicates: true,
    });
    inserted += chunk.length;
    process.stdout.write(`Inserted ${inserted} / ${candidates.length} Hindi words...\r`);
  }
  console.log(`\nSuccessfully inserted ${inserted} Hindi words into database.`);

  // Verify total Hindi words now in database
  const finalCount = await prisma.vocabularyWord.count({ where: { language: "hi" } });
  console.log(`Total Hindi vocabulary words in database: ${finalCount}`);

  // Synchronize deck for users
  console.log("Synchronizing Hindi Curricula decks for users...");
  const users = await prisma.user.findMany({ select: { id: true } });
  const allHindiWords = await prisma.vocabularyWord.findMany({
    where: { language: "hi" },
    select: { id: true, cefrLevel: true },
    orderBy: { frequencyRank: "asc" },
  });

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

    const existingListItems = await prisma.wordListItem.findMany({
      where: { wordListId: list.id },
      select: { vocabularyWordId: true },
    });
    const existingIds = new Set(existingListItems.map((li) => li.vocabularyWordId));

    const toAdd = allHindiWords
      .filter((w) => !existingIds.has(w.id))
      .map((w) => ({
        wordListId: list.id,
        vocabularyWordId: w.id,
      }));

    if (toAdd.length > 0) {
      for (let i = 0; i < toAdd.length; i += 200) {
        await prisma.wordListItem.createMany({
          data: toAdd.slice(i, i + 200),
          skipDuplicates: true,
        });
      }
    }
  }

  console.log("Hindi expansion complete!\n");
  return { inserted, total: finalCount };
}

if (require.main === module || process.argv[1]?.endsWith("import_hindi_expanded.ts")) {
  importExpandedHindi(2100)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error importing Hindi:", err);
      process.exit(1);
    });
}
