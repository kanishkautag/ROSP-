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
  if (/\b(hello|greet|greeting|welcome|thank|please|good morning|good night|goodbye|farewell)\b/.test(g)) {
    return "greetings";
  }
  if (/\b(mother|father|brother|sister|son|daughter|family|parent|uncle|aunt|cousin|child|wife|husband|grandfather|grandmother|sibling|relative)\b/.test(g)) {
    return "family";
  }
  if (/\b(food|eat|drink|water|bread|rice|fruit|vegetable|milk|tea|coffee|meal|cook|sugar|salt|sweet|curry|wheat|grain|apple|banana|mango|meat|egg)\b/.test(g)) {
    return "food";
  }
  if (/\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty|hundred|thousand|first|second|number|count|quantity)\b/.test(g)) {
    return "numbers";
  }
  if (pos === "verb" && /\b(go|come|do|make|see|look|hear|speak|say|tell|walk|run|give|take|know|think|sleep|sit|stand|eat|drink|write|read|work)\b/.test(g)) {
    return "common verbs";
  }
  if (/\b(travel|road|path|journey|car|bus|train|vehicle|station|ticket|city|village|country|map|direction|north|south|east|west|river|mountain|sea)\b/.test(g)) {
    return "travel";
  }
  if (/\b(shop|market|buy|sell|price|cost|money|rupee|coin|pay|cloth|clothes|store|merchant|trade|commerce)\b/.test(g)) {
    return "shopping";
  }
  if (/\b(school|college|university|student|teacher|study|learn|book|pen|exam|lesson|education|knowledge|science|history|paper|class)\b/.test(g)) {
    return "college";
  }
  if (/\b(happy|sad|joy|sorrow|anger|angry|fear|love|hope|pain|feeling|emotion|pleasure|grief|peace|laugh|cry|worry)\b/.test(g)) {
    return "emotions";
  }
  if (pos === "verb") {
    return "common verbs";
  }
  return "daily conversation";
}

// Assign progression difficulty
function assignDifficulty(topic: string, rank: number, pos: string): { cefrLevel: "A1" | "A2" | "B1" | "B2" | "C1"; difficulty: string } {
  if (topic === "greetings" || topic === "numbers" || (topic === "family" && rank <= 400)) {
    return { cefrLevel: "A1", difficulty: "A1 - Beginner" };
  }
  if (rank <= 300) {
    return { cefrLevel: "A1", difficulty: "A1 - Beginner" };
  }
  if (rank <= 800) {
    return { cefrLevel: "A2", difficulty: "A2 - Elementary" };
  }
  if (rank <= 1500) {
    return { cefrLevel: "B1", difficulty: "B1 - Intermediate" };
  }
  if (rank <= 2200) {
    return { cefrLevel: "B2", difficulty: "B2 - Upper Intermediate" };
  }
  return { cefrLevel: "C1", difficulty: "C1 - Advanced" };
}

function generateMarathiExample(word: string, pos: string, englishGloss: string, topic: string): { example: string; exampleTranslation: string } {
  switch (pos) {
    case "verb":
      return {
        example: `दररोज सराव केल्याने आपण चांगल्या प्रकारे ${word} शिकू शकतो.`,
        exampleTranslation: `With daily practice, we can learn to ${englishGloss} properly.`,
      };
    case "adj":
      return {
        example: `हा विषय अतिशय ${word} आणि समजायला सोपा आहे.`,
        exampleTranslation: `This topic is very ${englishGloss} and easy to understand.`,
      };
    case "adv":
      return {
        example: `त्यांनी आपले काम अतिशय ${word} पूर्ण केले.`,
        exampleTranslation: `They completed their work very ${englishGloss}.`,
      };
    case "noun":
    default:
      if (topic === "food") {
        return {
          example: `आरोग्यासाठी ताजे ${word} खाणे नेहमी फायदेशीर ठरते.`,
          exampleTranslation: `Eating fresh ${englishGloss} is always beneficial for health.`,
        };
      }
      if (topic === "family") {
        return {
          example: `माझे ${word} नेहमी मला चांगली शिकवण देतात.`,
          exampleTranslation: `My ${englishGloss} always imparts good values to me.`,
        };
      }
      return {
        example: `आपल्या दैनंदिन जीवनात ${word} खूप महत्त्वाचे स्थान आहे.`,
        exampleTranslation: `${englishGloss} holds a very important place in our daily life.`,
      };
  }
}

export async function importExpandedMarathi(targetTotal: number = 2100) {
  console.log("==================================================");
  console.log("   EXPANDING MARATHI VOCABULARY (मराठी)           ");
  console.log("==================================================");

  // 1. Fetch existing Marathi words in DB
  const existing = await prisma.vocabularyWord.findMany({
    where: { language: "mr" },
    select: { id: true, word: true, meaning: true },
  });
  const existingWords = new Set(existing.map((w) => w.word.normalize("NFC").trim()));
  console.log(`Current Marathi words in database: ${existing.length}`);

  const candidates: Array<{
    word: string;
    language: string;
    meaning: string;
    romanization: string | null;
    gender: string | null;
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
    https.get("https://kaikki.org/dictionary/Marathi/kaikki.org-dictionary-Marathi.jsonl", (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to download Kaikki Marathi, status: ${res.statusCode}`));
      }

      const rl = readline.createInterface({ input: res, crlfDelay: Infinity });

      let rankCounter = existing.length + 1;

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
              !/^(inflection|feminine|plural|masculine|neuter|oblique|alternative form|misspelling|synonym of) of/i.test(
                s.glosses[0]
              )
          );
          if (!sense || !sense.glosses?.[0]) return;

          const cleanGloss = sense.glosses[0].trim().replace(/^[\s;,-]+|[\s;,-]+$/g, "");
          if (cleanGloss.length < 2 || cleanGloss.length > 150) return;

          // Gender extraction (including Marathi 3-gender system: masculine, feminine, neuter)
          let gender: string | null = null;
          const headTemplate = entry.head_templates?.[0];
          if (headTemplate?.args?.g) {
            const g = headTemplate.args.g;
            if (g === "m") gender = "masculine";
            else if (g === "f") gender = "feminine";
            else if (g === "n") gender = "neuter";
          } else if (entry.tags) {
            if (entry.tags.includes("masculine")) gender = "masculine";
            else if (entry.tags.includes("feminine")) gender = "feminine";
            else if (entry.tags.includes("neuter")) gender = "neuter";
          }

          // Romanization
          const roman = entry.forms?.find((f) => f.tags?.includes("romanization"))?.form || null;

          // Audio
          const pronunciationUrl = entry.sounds?.[0]?.mp3_url || entry.sounds?.[0]?.ogg_url || null;

          // Topic & Progression
          const topic = classifyTopic(cleanGloss, pos);
          const { cefrLevel, difficulty } = assignDifficulty(topic, rankCounter, pos);

          // Example
          let exampleText = "";
          let exampleTranslation = "";
          if (sense.examples && sense.examples.length > 0 && sense.examples[0].text) {
            exampleText = sense.examples[0].text;
            exampleTranslation = sense.examples[0].english || "";
          }
          if (!exampleText) {
            const gen = generateMarathiExample(word, pos, cleanGloss, topic);
            exampleText = gen.example;
            exampleTranslation = gen.exampleTranslation;
          }

          const frequencyScore = Math.max(30, Math.round(95 - (rankCounter / 2500) * 45));

          existingWords.add(word);
          candidates.push({
            word,
            language: "mr",
            meaning: cleanGloss,
            romanization: roman,
            gender,
            partOfSpeech: pos,
            topic,
            cefrLevel,
            difficulty,
            frequency: frequencyScore,
            frequencyRank: rankCounter,
            example: exampleText,
            exampleTranslation,
            pronunciationUrl,
            source: "Wiktionary Marathi / Kaikki / Bharatavani",
            sourceUrl: "https://kaikki.org/dictionary/Marathi/",
            license: "CC-BY-SA 3.0 / 4.0",
          });

          rankCounter++;

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

  console.log(`Prepared ${candidates.length} new high-quality Marathi vocabulary entries.`);

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
    process.stdout.write(`Inserted ${inserted} / ${candidates.length} Marathi words...\r`);
  }
  console.log(`\nSuccessfully inserted ${inserted} Marathi words into database.`);

  // Verify total Marathi words now in database
  const finalCount = await prisma.vocabularyWord.count({ where: { language: "mr" } });
  console.log(`Total Marathi vocabulary words in database: ${finalCount}`);

  // Synchronize deck for users
  console.log("Synchronizing Marathi Curricula decks for users...");
  const users = await prisma.user.findMany({ select: { id: true } });
  const allMarathiWords = await prisma.vocabularyWord.findMany({
    where: { language: "mr" },
    select: { id: true, cefrLevel: true },
    orderBy: { frequencyRank: "asc" },
  });

  for (const user of users) {
    // Find or create primary Marathi deck
    let list = await prisma.wordList.findFirst({
      where: {
        userId: user.id,
        name: "Marathi Native Lexicon & Grammar (मराठी)",
      },
    });

    if (!list) {
      list = await prisma.wordList.create({
        data: {
          userId: user.id,
          name: "Marathi Native Lexicon & Grammar (मराठी)",
          description: "Curated native Marathi vocabulary, expressions, and grammar progression.",
        },
      });
    }

    // Add words to deck in manageable curriculum
    const existingListItems = await prisma.wordListItem.findMany({
      where: { wordListId: list.id },
      select: { vocabularyWordId: true },
    });
    const existingIds = new Set(existingListItems.map((li) => li.vocabularyWordId));

    const toAdd = allMarathiWords
      .filter((w) => !existingIds.has(w.id))
      .map((w) => ({
        wordListId: list.id,
        vocabularyWordId: w.id,
      }));

    if (toAdd.length > 0) {
      // batch insert in chunks of 200
      for (let i = 0; i < toAdd.length; i += 200) {
        await prisma.wordListItem.createMany({
          data: toAdd.slice(i, i + 200),
          skipDuplicates: true,
        });
      }
    }
  }

  console.log("Marathi expansion complete!\n");
  return { inserted, total: finalCount };
}

if (require.main === module || process.argv[1]?.endsWith("import_marathi_expanded.ts")) {
  importExpandedMarathi(2100)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error importing Marathi:", err);
      process.exit(1);
    });
}
