import { MULTILINGUAL_LEXICON } from "./curated_lexicon";
import { VOCABULARY_DATASET } from "./dataset";
import prisma from "../../packages/db/client";

export async function runIngestion() {
  console.log("=== ROSP Multi-language Vocabulary Ingestion Pipeline ===");

  // 1. Fetch all existing vocabulary words in ONE fast query
  const existingWords = await prisma.vocabularyWord.findMany({
    select: { id: true, word: true, language: true },
  });
  const wordMap = new Map<string, string>();
  for (const w of existingWords) {
    wordMap.set(`${w.language}:${w.word.normalize("NFC").trim()}`, w.id);
  }
  console.log(`Found ${existingWords.length} existing vocabulary words in vault.`);

  // 2. Prepare Curated Multilingual Lexicon items
  const newCuratedItems: any[] = [];
  const updateCuratedItems: { id: string; data: any }[] = [];

  for (const item of MULTILINGUAL_LEXICON) {
    const normalizedWord = item.word.normalize("NFC").trim();
    const key = `${item.language}:${normalizedWord}`;
    const existingId = wordMap.get(key);

    const payload = {
      word: normalizedWord,
      language: item.language,
      meaning: item.meaning.trim(),
      example: item.example.normalize("NFC").trim(),
      partOfSpeech: item.partOfSpeech,
      cefrLevel: item.difficulty,
      difficulty: item.difficulty,
      romanization: item.romanization,
      nativeDefinition: item.nativeDefinition.normalize("NFC").trim(),
      gender: item.gender,
      forms: item.forms,
      exampleTranslation: item.exampleTranslation,
      topic: item.topic,
      pronunciationUrl: item.pronunciationUrl,
      source: item.source,
      sourceUrl: item.sourceUrl,
      license: item.license,
    };

    if (!existingId) {
      newCuratedItems.push(payload);
    } else {
      updateCuratedItems.push({ id: existingId, data: payload });
    }
  }

  // Batch insert new curated items
  if (newCuratedItems.length > 0) {
    console.log(`Batch inserting ${newCuratedItems.length} new curated items...`);
    await prisma.vocabularyWord.createMany({
      data: newCuratedItems,
      skipDuplicates: true,
    });
  }

  // Update existing curated items sequentially to respect connection_limit=1
  if (updateCuratedItems.length > 0) {
    console.log(`Updating ${updateCuratedItems.length} existing curated items with rich metadata...`);
    for (const item of updateCuratedItems) {
      await prisma.vocabularyWord.update({
        where: { id: item.id },
        data: item.data,
      });
    }
  }

  // 3. Batch insert new legacy dataset items if any missing
  const newDatasetItems: any[] = [];
  for (const item of VOCABULARY_DATASET) {
    const normalizedWord = item.word.normalize("NFC").trim();
    const key = `${item.language}:${normalizedWord}`;
    if (!wordMap.has(key)) {
      newDatasetItems.push({
        word: normalizedWord,
        language: item.language,
        meaning: item.definition,
        example: item.example ? item.example.normalize("NFC").trim() : null,
        partOfSpeech: item.partOfSpeech,
        cefrLevel: item.cefrLevel,
        frequency: item.frequency,
        frequencyRank: item.frequencyRank,
        source: item.source,
      });
      wordMap.set(key, "temp");
    }
  }

  if (newDatasetItems.length > 0) {
    console.log(`Batch inserting ${newDatasetItems.length} new dataset items...`);
    await prisma.vocabularyWord.createMany({
      data: newDatasetItems,
      skipDuplicates: true,
    });
  }

  // 4. Report total counts per language
  const counts = await prisma.vocabularyWord.groupBy({
    by: ["language"],
    _count: { id: true },
  });
  console.log("Current vocabulary counts by language in vault:", counts);

  // 5. Curate distinct starter decks for all registered users
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Populating curated decks across ${users.length} user(s)...`);

  const curatedDecks = [
    {
      name: "Hindi Essentials & Conversational (हिंदी)",
      description: "Core Hindi vocabulary, common idioms, and daily conversational expressions.",
      language: "hi",
    },
    {
      name: "Marathi Native Lexicon & Grammar (मराठी)",
      description: "Authentic Marathi vocabulary with gender, verb forms, and cultural expressions.",
      language: "mr",
    },
    {
      name: "English Academic & Conversational (English)",
      description: "Essential academic and conversational lexicon for proficient English learners.",
      language: "en",
    },
  ];

  for (const deck of curatedDecks) {
    const deckWords = await prisma.vocabularyWord.findMany({
      where: { language: deck.language },
      select: { id: true },
    });
    const deckVocabIds = deckWords.map((w) => w.id);
    if (deckVocabIds.length === 0) continue;

    for (const user of users) {
      let list = await prisma.wordList.findFirst({
        where: { userId: user.id, name: deck.name },
      });

      if (!list) {
        list = await prisma.wordList.create({
          data: {
            userId: user.id,
            name: deck.name,
            description: deck.description,
          },
        });
      }

      // Link words to list
      const existingItems = await prisma.wordListItem.findMany({
        where: { wordListId: list.id },
        select: { vocabularyWordId: true },
      });
      const existingItemIds = new Set(existingItems.map((i) => i.vocabularyWordId));

      const itemsToCreate = deckVocabIds
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

      // Ensure UserWord records exist for study
      const existingUserWords = await prisma.userWord.findMany({
        where: { userId: user.id, vocabularyWordId: { in: deckVocabIds } },
        select: { id: true, vocabularyWordId: true },
      });
      const existingUserWordVocabIds = new Set(existingUserWords.map((uw) => uw.vocabularyWordId));

      const userWordsToCreate = deckVocabIds
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
      const userWordsWithoutState = await prisma.userWord.findMany({
        where: {
          userId: user.id,
          vocabularyWordId: { in: deckVocabIds },
          learningState: null,
        },
        select: { id: true },
      });

      if (userWordsWithoutState.length > 0) {
        await prisma.learningState.createMany({
          data: userWordsWithoutState.map((uw) => ({
            userWordId: uw.id,
            algorithm: "SM2",
            repetitions: 0,
            interval: 1.0,
            easeFactor: 2.5,
            nextReviewAt: new Date(),
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  console.log("=== Multi-language ingestion pipeline completed successfully! ===");
}

runIngestion()
  .catch((err) => {
    console.error("Ingestion failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
