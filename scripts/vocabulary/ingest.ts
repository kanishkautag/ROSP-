import { VOCABULARY_DATASET } from "./dataset";
import prisma from "../../packages/db/client";

async function runIngestion() {
  console.log("=== ROSP Vocabulary Ingestion Pipeline ===");
  console.log(`Processing ${VOCABULARY_DATASET.length} normalized lexical items...`);

  let added = 0;
  let updated = 0;

  for (const item of VOCABULARY_DATASET) {
    try {
      const existing = await prisma.vocabularyWord.findFirst({
        where: {
          word: item.word,
          language: item.language,
        },
      });

      if (!existing) {
        await prisma.vocabularyWord.create({
          data: {
            word: item.word,
            language: item.language,
            meaning: item.definition,
            example: item.example,
            partOfSpeech: item.partOfSpeech,
            cefrLevel: item.cefrLevel,
            frequency: item.frequency,
            frequencyRank: item.frequencyRank,
            source: item.source,
          },
        });
        added++;
      } else {
        await prisma.vocabularyWord.update({
          where: { id: existing.id },
          data: {
            meaning: item.definition,
            example: item.example,
            partOfSpeech: item.partOfSpeech,
            cefrLevel: item.cefrLevel,
            frequency: item.frequency,
            frequencyRank: item.frequencyRank,
            source: item.source,
          },
        });
        updated++;
      }
    } catch (err) {
      console.error(`Error processing word "${item.word}":`, err);
    }
  }

  console.log(`Canonical vocabulary sync completed:`);
  console.log(`- New words added: ${added}`);
  console.log(`- Existing words refreshed: ${updated}`);

  // Fetch all vocabulary words to create an ID map
  const allVocab = await prisma.vocabularyWord.findMany({
    select: { id: true, word: true, source: true },
  });
  const vocabMap = new Map(allVocab.map((v) => [v.word, v.id]));

  // Curate starter decks for all registered users
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`Populating curated decks for ${users.length} user(s)...`);

  const curatedDecks = [
    {
      name: "GRE High-Frequency 333",
      description: "Essential high-yield vocabulary tested frequently on GRE Verbal Reasoning.",
      filterSource: "GRE High-Frequency",
    },
    {
      name: "TOEFL Academic Word List",
      description: "Core academic lexicon for TOEFL iBT reading, listening, and speaking.",
      filterSource: "TOEFL Academic",
    },
    {
      name: "IELTS Band 8+ Masterclass",
      description: "Sophisticated vocabulary and collocations to reach band 8.0-9.0 in IELTS.",
      filterSource: "IELTS Band 8+",
    },
  ];

  for (const user of users) {
    for (const deck of curatedDecks) {
      // Find or create wordList
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

      // Words belonging to this deck source
      const deckVocabIds = allVocab
        .filter((w) => w.source === deck.filterSource)
        .map((w) => w.id);

      if (deckVocabIds.length === 0) continue;

      // Existing list items
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
      const allUserWordsForDeck = await prisma.userWord.findMany({
        where: { userId: user.id, vocabularyWordId: { in: deckVocabIds } },
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
  }

  console.log("Curated decks synchronized successfully.");
}

runIngestion()
  .catch((e) => {
    console.error("Ingestion failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
