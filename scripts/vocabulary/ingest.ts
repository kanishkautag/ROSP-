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

  console.log(`Ingestion completed successfully.`);
  console.log(`- New words added: ${added}`);
  console.log(`- Existing words refreshed: ${updated}`);
  console.log(`- Total canonical vocabulary: ${added + updated}`);
}

runIngestion()
  .catch((e) => {
    console.error("Ingestion failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
