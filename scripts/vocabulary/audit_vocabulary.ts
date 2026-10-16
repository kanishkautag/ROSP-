import prisma from "../../packages/db/client";

export async function auditDatabase() {
  console.log("=================================================");
  console.log("       ROSP VOCABULARY & PROGRESS AUDIT          ");
  console.log("=================================================");

  // 1. Total counts & language breakdown
  const total = await prisma.vocabularyWord.count();
  const byLang = await prisma.vocabularyWord.groupBy({
    by: ["language"],
    _count: { id: true },
  });

  console.log(`\n1. Current Database Counts:`);
  console.log(`   Total Vocabulary Words: ${total}`);
  for (const g of byLang) {
    console.log(`   - ${g.language.toUpperCase()}: ${g._count.id} words`);
  }

  // 2. Duplicate Detection (Normalized Unicode NFC + lowercase + language)
  const allWords = await prisma.vocabularyWord.findMany({
    select: { id: true, word: true, language: true, meaning: true, source: true },
  });

  const seenMap = new Map<string, { id: string; word: string; meaning: string }>();
  const duplicates: Array<{ key: string; original: any; duplicate: any }> = [];

  for (const w of allWords) {
    const normalized = w.word.normalize("NFC").trim().toLowerCase();
    const key = `${w.language}:${normalized}`;
    if (seenMap.has(key)) {
      duplicates.push({
        key,
        original: seenMap.get(key),
        duplicate: { id: w.id, word: w.word, meaning: w.meaning },
      });
    } else {
      seenMap.set(key, { id: w.id, word: w.word, meaning: w.meaning });
    }
  }

  console.log(`\n2. Duplicate Audit:`);
  console.log(`   Duplicates found: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log(`   Sample duplicates:`, duplicates.slice(0, 5));
  }

  // 3. Metadata Completeness Audit
  const missingMeaning = allWords.filter((w) => !w.meaning || !w.meaning.trim()).length;
  const missingPos = await prisma.vocabularyWord.count({ where: { partOfSpeech: null } });
  const missingTopic = await prisma.vocabularyWord.count({ where: { topic: null } });
  const missingExample = await prisma.vocabularyWord.count({ where: { example: null } });
  const missingDifficulty = await prisma.vocabularyWord.count({
    where: { difficulty: null, cefrLevel: null },
  });

  // Indic specific metadata
  const indicWords = await prisma.vocabularyWord.findMany({
    where: { language: { in: ["hi", "mr"] } },
    select: { id: true, word: true, language: true, romanization: true, gender: true, forms: true },
  });

  const indicMissingRomanization = indicWords.filter((w) => !w.romanization || !w.romanization.trim()).length;
  const indicMissingGender = indicWords.filter((w) => !w.gender).length;

  console.log(`\n3. Metadata Quality Audit:`);
  console.log(`   - Missing Meaning / Definition: ${missingMeaning}`);
  console.log(`   - Missing Part of Speech: ${missingPos}`);
  console.log(`   - Missing Topic Categorization: ${missingTopic}`);
  console.log(`   - Missing Example Sentence: ${missingExample}`);
  console.log(`   - Missing Difficulty / CEFR Level: ${missingDifficulty}`);
  console.log(`   - Indic words without Romanization / Transliteration: ${indicMissingRomanization} / ${indicWords.length}`);
  console.log(`   - Indic words without Grammatical Gender: ${indicMissingGender} / ${indicWords.length}`);

  // 4. Script & Language Consistency Audit
  // Check if Latin characters exist in Hindi/Marathi words or Devanagari in English
  const devanagariRegex = /[\u0900-\u097F]/;
  const latinRegex = /[a-zA-Z]/;

  const englishWithDevanagari = allWords.filter(
    (w) => w.language === "en" && devanagariRegex.test(w.word)
  );
  const indicWithPureLatin = indicWords.filter(
    (w) => !devanagariRegex.test(w.word) && latinRegex.test(w.word)
  );

  console.log(`\n4. Language Assignment & Script Integrity:`);
  console.log(`   - English entries with Devanagari script: ${englishWithDevanagari.length}`);
  console.log(`   - Indic entries (hi/mr) with pure Latin script: ${indicWithPureLatin.length}`);
  if (indicWithPureLatin.length > 0) {
    console.log(`   Sample Indic entries in Latin:`, indicWithPureLatin.slice(0, 5));
  }

  // 5. User Progress & Review History Preservation Audit
  const [totalUsers, totalLists, totalListItems, totalUserWords, totalReviews, totalActivities, totalXpEvents] =
    await Promise.all([
      prisma.user.count(),
      prisma.wordList.count(),
      prisma.wordListItem.count(),
      prisma.userWord.count(),
      prisma.reviewAttempt.count(),
      prisma.dailyActivity.count(),
      prisma.xpEvent.count(),
    ]);

  console.log(`\n5. User Learning Progress & History Preservation:`);
  console.log(`   - Total Users: ${totalUsers}`);
  console.log(`   - Total Word Lists (Curricula / Decks): ${totalLists}`);
  console.log(`   - Total Word List Mappings: ${totalListItems}`);
  console.log(`   - Total User Word Trackers: ${totalUserWords}`);
  console.log(`   - Total Review Attempts (Spaced Repetition History): ${totalReviews}`);
  console.log(`   - Total Daily Activity Records: ${totalActivities}`);
  console.log(`   - Total XP Events in Ledger: ${totalXpEvents}`);

  console.log("\n=================================================\n");

  return {
    total,
    byLang,
    duplicates,
    missingPos,
    missingTopic,
    missingExample,
    indicMissingRomanization,
    indicMissingGender,
    englishWithDevanagari: englishWithDevanagari.length,
    indicWithPureLatin: indicWithPureLatin.length,
    userStats: {
      totalUsers,
      totalLists,
      totalListItems,
      totalUserWords,
      totalReviews,
      totalActivities,
      totalXpEvents,
    },
  };
}

if (require.main === module || process.argv[1]?.endsWith("audit_vocabulary.ts")) {
  auditDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Audit error:", err);
      process.exit(1);
    });
}
