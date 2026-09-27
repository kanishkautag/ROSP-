import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { OnboardingSchema } from "@rosp/shared";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = OnboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { nativeLanguage, targetLanguage, cefrLevel, dailyGoal, algorithm } = parsed.data;

    // Create starter word list matching chosen CEFR level
    const starterListName = `${targetLanguage.toUpperCase()} Foundations (${cefrLevel})`;
    const starterList = await prisma.wordList.create({
      data: {
        userId: user.id,
        name: starterListName,
        description: `Personalized starter list configured during onboarding for ${cefrLevel} proficiency.`,
      },
    });

    // Find vocabulary words matching target CEFR level
    const starterWords = await prisma.vocabularyWord.findMany({
      where: { cefrLevel },
      take: 10,
    });

    // Populate words into starter list and user_words
    for (const w of starterWords) {
      await prisma.wordListItem.upsert({
        where: {
          wordListId_vocabularyWordId: {
            wordListId: starterList.id,
            vocabularyWordId: w.id,
          },
        },
        update: {},
        create: {
          wordListId: starterList.id,
          vocabularyWordId: w.id,
        },
      });

      const userWord = await prisma.userWord.upsert({
        where: {
          userId_vocabularyWordId: {
            userId: user.id,
            vocabularyWordId: w.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          vocabularyWordId: w.id,
        },
      });

      await prisma.learningState.upsert({
        where: { userWordId: userWord.id },
        update: { algorithm: algorithm as any },
        create: {
          userWordId: userWord.id,
          algorithm: algorithm as any,
          repetitions: 0,
          interval: 1.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      starterListId: starterList.id,
      starterWordCount: starterWords.length,
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
