import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { AnkiImportInputSchema } from "@rosp/shared";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = AnkiImportInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { targetListId, newListName, newListDescription, cards } = parsed.data;

    let listId = targetListId;

    // Create a new list if requested or no targetListId was provided
    if (!listId) {
      const createdList = await prisma.wordList.create({
        data: {
          userId: user.id,
          name: newListName || `Imported Deck (${new Date().toLocaleDateString()})`,
          description: newListDescription || "Imported from Anki flashcards",
        },
      });
      listId = createdList.id;
    }

    let importedCount = 0;

    for (const card of cards) {
      // 1. Find or create canonical vocabulary word
      let wordRecord = await prisma.vocabularyWord.findFirst({
        where: {
          word: card.word.toLowerCase(),
          language: "en",
        },
      });

      if (!wordRecord) {
        wordRecord = await prisma.vocabularyWord.create({
          data: {
            word: card.word.toLowerCase(),
            language: "en",
            meaning: card.meaning,
            example: card.example,
            partOfSpeech: card.partOfSpeech,
            cefrLevel: card.cefrLevel,
            source: "Anki Import",
          },
        });
      }

      // 2. Link word to the list
      await prisma.wordListItem.upsert({
        where: {
          wordListId_vocabularyWordId: {
            wordListId: listId,
            vocabularyWordId: wordRecord.id,
          },
        },
        update: {},
        create: {
          wordListId: listId,
          vocabularyWordId: wordRecord.id,
        },
      });

      // 3. Link word to user
      const userWord = await prisma.userWord.upsert({
        where: {
          userId_vocabularyWordId: {
            userId: user.id,
            vocabularyWordId: wordRecord.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          vocabularyWordId: wordRecord.id,
        },
      });

      // 4. Initialize learning state if not exists
      await prisma.learningState.upsert({
        where: { userWordId: userWord.id },
        update: {},
        create: {
          userWordId: userWord.id,
          algorithm: "SM2",
          repetitions: 0,
          interval: 1.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
        },
      });

      importedCount++;
    }

    return NextResponse.json({
      success: true,
      importedCount,
      listId,
    });
  } catch (error: any) {
    console.error("Anki import error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
