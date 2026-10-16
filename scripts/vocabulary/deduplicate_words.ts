import prisma from "../../packages/db/client";

export async function deduplicateVocabulary() {
  console.log("=== Finding Duplicates ===");
  const allWords = await prisma.vocabularyWord.findMany({
    orderBy: { createdAt: "asc" }, // canonical is the oldest, or whichever has more rich metadata
    include: {
      listItems: true,
      userWords: {
        include: {
          learningState: true,
          reviewAttempts: true,
        },
      },
    },
  });

  const seen = new Map<string, typeof allWords[0]>();
  const toDeleteIds: string[] = [];
  let mergedListItems = 0;
  let mergedUserWords = 0;
  let mergedReviewAttempts = 0;

  for (const w of allWords) {
    const key = `${w.language}:${w.word.normalize("NFC").trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, w);
    } else {
      const canonical = seen.get(key)!;
      console.log(`Duplicate found for "${w.word}" (${w.language}): duplicate id ${w.id} -> canonical id ${canonical.id}`);

      // 1. If canonical is missing fields (example, topic, romanization, etc.) but duplicate has them, update canonical!
      const updates: any = {};
      if (!canonical.example && w.example) updates.example = w.example;
      if (!canonical.topic && w.topic) updates.topic = w.topic;
      if (!canonical.romanization && w.romanization) updates.romanization = w.romanization;
      if (!canonical.gender && w.gender) updates.gender = w.gender;
      if (!canonical.forms && w.forms) updates.forms = w.forms;
      if (!canonical.exampleTranslation && w.exampleTranslation) updates.exampleTranslation = w.exampleTranslation;
      if (!canonical.pronunciationUrl && w.pronunciationUrl) updates.pronunciationUrl = w.pronunciationUrl;
      if (Object.keys(updates).length > 0) {
        await prisma.vocabularyWord.update({
          where: { id: canonical.id },
          data: updates,
        });
        console.log(`  Enriched canonical ${canonical.word} with metadata from duplicate.`);
      }

      // 2. Handle WordListItem foreign keys
      for (const item of w.listItems) {
        // check if canonical is already in this wordList
        const existingInList = await prisma.wordListItem.findUnique({
          where: {
            wordListId_vocabularyWordId: {
              wordListId: item.wordListId,
              vocabularyWordId: canonical.id,
            },
          },
        });

        if (existingInList) {
          // delete the duplicate list item
          await prisma.wordListItem.delete({ where: { id: item.id } });
        } else {
          // remap list item to canonical
          await prisma.wordListItem.update({
            where: { id: item.id },
            data: { vocabularyWordId: canonical.id },
          });
        }
        mergedListItems++;
      }

      // 3. Handle UserWord foreign keys & review history
      for (const uw of w.userWords) {
        const canonicalUserWord = await prisma.userWord.findUnique({
          where: {
            userId_vocabularyWordId: {
              userId: uw.userId,
              vocabularyWordId: canonical.id,
            },
          },
          include: {
            learningState: true,
            reviewAttempts: true,
          },
        });

        if (canonicalUserWord) {
          // Move review attempts from duplicate UserWord to canonical UserWord
          if (uw.reviewAttempts.length > 0) {
            await prisma.reviewAttempt.updateMany({
              where: { userWordId: uw.id },
              data: { userWordId: canonicalUserWord.id },
            });
            mergedReviewAttempts += uw.reviewAttempts.length;
          }

          // If canonical has no learningState but duplicate does, move it
          if (!canonicalUserWord.learningState && uw.learningState) {
            await prisma.learningState.update({
              where: { userWordId: uw.id },
              data: { userWordId: canonicalUserWord.id },
            });
          } else if (uw.learningState) {
            // delete duplicate's learning state before deleting userWord
            await prisma.learningState.delete({ where: { userWordId: uw.id } });
          }

          // Delete duplicate UserWord
          await prisma.userWord.delete({ where: { id: uw.id } });
        } else {
          // Remap userWord to canonical
          await prisma.userWord.update({
            where: { id: uw.id },
            data: { vocabularyWordId: canonical.id },
          });
        }
        mergedUserWords++;
      }

      // Now safe to delete duplicate VocabularyWord
      toDeleteIds.push(w.id);
    }
  }

  console.log(`\nDeleting ${toDeleteIds.length} duplicate VocabularyWord records...`);
  for (const id of toDeleteIds) {
    await prisma.vocabularyWord.delete({ where: { id } });
  }

  console.log(`\nDeduplication Summary:`);
  console.log(`- Duplicates removed: ${toDeleteIds.length}`);
  console.log(`- WordListItems merged/remapped: ${mergedListItems}`);
  console.log(`- UserWords merged/remapped: ${mergedUserWords}`);
  console.log(`- ReviewAttempts preserved/moved: ${mergedReviewAttempts}`);
}

if (require.main === module || process.argv[1]?.endsWith("deduplicate_words.ts")) {
  deduplicateVocabulary()
    .then(() => {
      console.log("Deduplication completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Deduplication failed:", err);
      process.exit(1);
    });
}
