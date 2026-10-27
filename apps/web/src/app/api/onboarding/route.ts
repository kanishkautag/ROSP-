import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { OnboardingSchema } from "@rosp/shared";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

const CEFR_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const STARTER_WORD_COUNT = 15;

/**
 * Returns CEFR levels ordered by distance from the chosen level, so that
 * thin levels (e.g. Hindi C2, Marathi C1) are topped up from neighbours.
 */
function levelsByProximity(level: string): string[] {
  const idx = CEFR_ORDER.indexOf(level as (typeof CEFR_ORDER)[number]);
  return [...CEFR_ORDER].sort(
    (a, b) => Math.abs(CEFR_ORDER.indexOf(a) - idx) - Math.abs(CEFR_ORDER.indexOf(b) - idx)
  );
}

/** GET: current onboarding preferences (used to prefill the wizard). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      nativeLanguage: true,
      targetLanguage: true,
      cefrLevel: true,
      dailyGoal: true,
      preferredAlgorithm: true,
      onboardedAt: true,
    },
  });

  return NextResponse.json({
    nativeLanguage: profile?.nativeLanguage ?? null,
    targetLanguage: profile?.targetLanguage ?? null,
    cefrLevel: profile?.cefrLevel ?? null,
    dailyGoal: profile?.dailyGoal ?? null,
    algorithm: profile?.preferredAlgorithm ?? "SM2",
    onboarded: Boolean(profile?.onboardedAt),
  });
}

/** POST: save preferences and provision a starter deck in the target language. */
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

    // 1. Persist preferences on the user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        nativeLanguage,
        targetLanguage,
        cefrLevel,
        dailyGoal,
        preferredAlgorithm: algorithm,
        onboardedAt: new Date(),
      },
    });

    // 2. Find or create the starter list (re-running onboarding must not duplicate it)
    const starterListName = `${LANGUAGE_NAMES[targetLanguage]} Foundations (${cefrLevel})`;
    const starterList =
      (await prisma.wordList.findFirst({
        where: { userId: user.id, name: starterListName },
      })) ??
      (await prisma.wordList.create({
        data: {
          userId: user.id,
          name: starterListName,
          description: `Starter ${LANGUAGE_NAMES[targetLanguage]} deck for ${cefrLevel} learners, created during onboarding.`,
        },
      }));

    // 3. Pick starter words in the TARGET language, nearest CEFR levels first
    const starterWords: { id: string }[] = [];
    for (const level of levelsByProximity(cefrLevel)) {
      if (starterWords.length >= STARTER_WORD_COUNT) break;
      const batch = await prisma.vocabularyWord.findMany({
        where: {
          language: targetLanguage,
          cefrLevel: level,
          source: { notIn: ["user_personal_ephemeral"] },
          id: { notIn: starterWords.map((w) => w.id) },
        },
        orderBy: [{ frequencyRank: { sort: "asc", nulls: "last" } }, { word: "asc" }],
        take: STARTER_WORD_COUNT - starterWords.length,
        select: { id: true },
      });
      starterWords.push(...batch);
    }

    const wordIds = starterWords.map((w) => w.id);

    if (wordIds.length > 0) {
      // 4. Batched writes (previously ~3 round-trips per word)
      await prisma.wordListItem.createMany({
        data: wordIds.map((vocabularyWordId) => ({ wordListId: starterList.id, vocabularyWordId })),
        skipDuplicates: true,
      });

      await prisma.userWord.createMany({
        data: wordIds.map((vocabularyWordId) => ({ userId: user.id, vocabularyWordId })),
        skipDuplicates: true,
      });

      const userWords = await prisma.userWord.findMany({
        where: { userId: user.id, vocabularyWordId: { in: wordIds } },
        select: { id: true },
      });

      await prisma.learningState.createMany({
        data: userWords.map((uw) => ({
          userWordId: uw.id,
          algorithm,
          repetitions: 0,
          interval: 1.0,
          easeFactor: 2.5,
          nextReviewAt: new Date(),
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      success: true,
      starterListId: starterList.id,
      starterListName,
      starterWordCount: wordIds.length,
    });
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
