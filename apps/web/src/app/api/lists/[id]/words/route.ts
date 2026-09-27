import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const list = await prisma.wordList.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const body = await req.json();
    let vocabularyWordId = body.vocabularyWordId;

    // If adding a custom or new word
    if (!vocabularyWordId && body.word && body.meaning) {
      const cleanWord = body.word.trim().toLowerCase();
      let vocab = await prisma.vocabularyWord.findFirst({
        where: { word: cleanWord },
      });

      if (!vocab) {
        vocab = await prisma.vocabularyWord.create({
          data: {
            word: cleanWord,
            language: body.language || "en",
            meaning: body.meaning.trim(),
            example: body.example?.trim() || null,
            partOfSpeech: body.partOfSpeech || "noun",
            cefrLevel: body.cefrLevel || "B2",
            source: "User Added",
          },
        });
      }
      vocabularyWordId = vocab.id;
    }

    if (!vocabularyWordId) {
      return NextResponse.json(
        { error: "vocabularyWordId or word+meaning is required" },
        { status: 400 }
      );
    }

    // Connect to word list
    const listItem = await prisma.wordListItem.upsert({
      where: {
        wordListId_vocabularyWordId: {
          wordListId: params.id,
          vocabularyWordId,
        },
      },
      update: {},
      create: {
        wordListId: params.id,
        vocabularyWordId,
      },
      include: {
        vocabularyWord: true,
      },
    });

    // Also register into UserWord and LearningState for reviews
    const userWord = await prisma.userWord.upsert({
      where: {
        userId_vocabularyWordId: {
          userId: user.id,
          vocabularyWordId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        vocabularyWordId,
      },
    });

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

    return NextResponse.json({ success: true, item: listItem }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding word to list:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
