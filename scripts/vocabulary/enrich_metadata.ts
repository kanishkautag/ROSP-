import prisma from "../../packages/db/client";

// Robust Devanagari transliterator for Hindi and Marathi
const DEVANAGARI_MAP: Record<string, string> = {
  // Independent vowels
  "अ": "a", "आ": "aa", "इ": "i", "ई": "ee", "उ": "u", "ऊ": "oo", "ऋ": "ri",
  "ए": "e", "ऐ": "ai", "ओ": "o", "औ": "au", "अं": "am", "अः": "ah",
  // Dependent vowel signs (matras)
  "ा": "aa", "ि": "i", "ी": "ee", "ु": "u", "ू": "oo", "ृ": "ri",
  "े": "e", "ै": "ai", "ो": "o", "ौ": "au", "ं": "n", "ः": "h", "ॅ": "e", "ॉ": "o",
  // Consonants
  "क": "k", "ख": "kh", "ग": "g", "घ": "gh", "ङ": "ng",
  "च": "ch", "छ": "chh", "ज": "j", "झ": "jh", "ञ": "ny",
  "ट": "t", "ठ": "th", "ड": "d", "ढ": "dh", "ण": "n",
  "त": "t", "थ": "th", "द": "d", "ध": "dh", "न": "n",
  "प": "p", "फ": "ph", "ब": "b", "भ": "bh", "म": "m",
  "य": "y", "र": "r", "ल": "l", "व": "v", "श": "sh",
  "ष": "sh", "स": "s", "ह": "h", "ळ": "l", "क्ष": "ksh", "ज्ञ": "gya",
  // Nukta consonants
  "क़": "q", "ख़": "kh", "ग़": "gh", "ज़": "z", "ड़": "r", "ढ़": "rh", "फ़": "f",
  // Virama / Halant
  "्": "",
};

function transliterateDevanagari(text: string): string {
  let result = "";
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const nextCh = chars[i + 1];

    if (DEVANAGARI_MAP[ch] !== undefined) {
      result += DEVANAGARI_MAP[ch];
      const isConsonant = /[\u0915-\u0939\u0958-\u095F]/.test(ch);
      const isNextMatraOrVirama = nextCh && /[\u093E-\u094D\u0902\u0903]/.test(nextCh);
      if (isConsonant && !isNextMatraOrVirama) {
        if (i < chars.length - 1 && /[\u0915-\u0939]/.test(nextCh)) {
          result += "a";
        }
      }
    } else {
      result += ch;
    }
  }
  return result.trim().toLowerCase();
}

export async function enrichMetadata() {
  console.log("==================================================");
  console.log("       ENRICHING VOCABULARY METADATA              ");
  console.log("==================================================");

  // 1. English example sentences via fast single SQL query
  console.log("Updating missing English example sentences...");
  const updatedExamples = await prisma.$executeRawUnsafe(`
    UPDATE vocabulary_words
    SET example = CASE
      WHEN lower(part_of_speech) = 'verb' THEN 'She decided to ' || lower(word) || ' early every morning to achieve her goals.'
      WHEN lower(part_of_speech) IN ('adj', 'adjective') THEN 'The professor gave a very ' || lower(word) || ' presentation on the topic.'
      WHEN lower(part_of_speech) IN ('adv', 'adverb') THEN 'The committee acted ' || lower(word) || ' to resolve the issue before noon.'
      ELSE 'The importance of ' || lower(word) || ' was highlighted throughout the discussion.'
    END
    WHERE language = 'en' AND (example IS NULL OR trim(example) = '');
  `);
  console.log(`Updated ${updatedExamples} English example sentences.`);

  // 2. English topics via SQL regex classification
  console.log("Updating missing English topic categorizations...");
  const updatedTopics = await prisma.$executeRawUnsafe(`
    UPDATE vocabulary_words
    SET topic = CASE
      WHEN word ~* '\\y(hello|greet|welcome|please|thank|pardon|sorry|goodbye|hi)\\y' THEN 'greetings'
      WHEN word ~* '\\y(mother|father|parent|brother|sister|son|daughter|family|child|husband|wife|cousin|uncle|aunt)\\y' THEN 'family'
      WHEN word ~* '\\y(food|eat|drink|water|bread|fruit|vegetable|meat|meal|rice|milk|tea|coffee|cook|kitchen)\\y' THEN 'food'
      WHEN word ~* '\\y(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|number|first|second|count)\\y' THEN 'numbers'
      WHEN word ~* '\\y(travel|trip|road|journey|car|bus|train|flight|plane|station|airport|city|country|map|ticket)\\y' THEN 'travel'
      WHEN word ~* '\\y(shop|store|market|buy|sell|price|cost|money|pay|dollar|cash|bank|purchase)\\y' THEN 'shopping'
      WHEN word ~* '\\y(school|college|university|student|teacher|study|learn|book|exam|class|lesson|lecture|education)\\y' THEN 'college'
      WHEN word ~* '\\y(happy|sad|joy|sorrow|anger|angry|fear|love|hope|pain|emotion|feeling|worry)\\y' THEN 'emotions'
      WHEN lower(part_of_speech) = 'verb' THEN 'common verbs'
      ELSE 'daily conversation'
    END
    WHERE language = 'en' AND (topic IS NULL OR trim(topic) = '');
  `);
  console.log(`Updated ${updatedTopics} English topics.`);

  // 3. Indic Romanization transliteration
  console.log("Fetching Indic words missing Romanization...");
  const indicMissingRoman = await prisma.vocabularyWord.findMany({
    where: {
      language: { in: ["hi", "mr"] },
      OR: [{ romanization: null }, { romanization: "" }],
    },
    select: { id: true, word: true },
  });

  console.log(`Transliterating ${indicMissingRoman.length} Indic words...`);
  for (const item of indicMissingRoman) {
    const roman = transliterateDevanagari(item.word);
    if (roman) {
      await prisma.vocabularyWord.update({
        where: { id: item.id },
        data: { romanization: roman },
      });
    }
  }
  console.log(`Transliterated ${indicMissingRoman.length} Indic words.`);

  // 4. Indic missing topics
  const updatedIndicTopics = await prisma.$executeRawUnsafe(`
    UPDATE vocabulary_words
    SET topic = CASE
      WHEN definition ~* '\\y(hello|greet|welcome|please|thank|morning|night|peace)\\y' THEN 'greetings'
      WHEN definition ~* '\\y(mother|father|parent|brother|sister|son|daughter|family|child|husband|wife|cousin)\\y' THEN 'family'
      WHEN definition ~* '\\y(food|eat|drink|water|bread|fruit|vegetable|meat|meal|rice|milk|tea|coffee|cook)\\y' THEN 'food'
      WHEN definition ~* '\\y(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|number)\\y' THEN 'numbers'
      WHEN definition ~* '\\y(travel|trip|road|journey|car|bus|train|city|village|country|map|direction)\\y' THEN 'travel'
      WHEN definition ~* '\\y(shop|market|buy|sell|price|cost|money|rupee|pay|cloth|clothes|store)\\y' THEN 'shopping'
      WHEN definition ~* '\\y(school|college|university|student|teacher|study|learn|book|class)\\y' THEN 'college'
      WHEN definition ~* '\\y(happy|sad|joy|sorrow|anger|fear|love|hope|pain|emotion)\\y' THEN 'emotions'
      WHEN lower(part_of_speech) = 'verb' THEN 'common verbs'
      ELSE 'daily conversation'
    END
    WHERE language IN ('hi', 'mr') AND (topic IS NULL OR trim(topic) = '');
  `);
  console.log(`Updated ${updatedIndicTopics} Indic topics.`);

  console.log("\nMetadata enrichment complete!");
}

if (require.main === module || process.argv[1]?.endsWith("enrich_metadata.ts")) {
  enrichMetadata()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Enrichment error:", err);
      process.exit(1);
    });
}
