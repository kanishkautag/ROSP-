import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { MoveWordSchema } from "@rosp/shared";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MoveWordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { wordId, sourceListId, targetListId } = parsed.data;

    // Verify ownership of both lists
    const [sourceList, targetList] = await Promise.all([
      prisma.wordList.findFirst({ where: { id: sourceListId, userId: user.id } }),
      prisma.wordList.findFirst({ where: { id: targetListId, userId: user.id } }),
    ]);

    if (!sourceList || !targetList) {
      return NextResponse.json(
        { error: "One or both word lists not found or access denied" },
        { status: 404 }
      );
    }

    // Upsert into target list
    await prisma.wordListItem.upsert({
      where: {
        wordListId_vocabularyWordId: {
          wordListId: targetListId,
          vocabularyWordId: wordId,
        },
      },
      update: {},
      create: {
        wordListId: targetListId,
        vocabularyWordId: wordId,
      },
    });

    // Delete from source list
    await prisma.wordListItem.deleteMany({
      where: {
        wordListId: sourceListId,
        vocabularyWordId: wordId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Move word error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
