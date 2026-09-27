import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";
import { MergeListsSchema } from "@rosp/shared";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = MergeListsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { sourceListId, targetListId, deleteSource } = parsed.data;

    if (sourceListId === targetListId) {
      return NextResponse.json(
        { error: "Source and target list cannot be identical" },
        { status: 400 }
      );
    }

    // Verify ownership
    const [sourceList, targetList] = await Promise.all([
      prisma.wordList.findFirst({
        where: { id: sourceListId, userId: user.id },
        include: { items: true },
      }),
      prisma.wordList.findFirst({
        where: { id: targetListId, userId: user.id },
      }),
    ]);

    if (!sourceList || !targetList) {
      return NextResponse.json(
        { error: "Lists not found or access denied" },
        { status: 404 }
      );
    }

    // Move all items from source to target
    for (const item of sourceList.items) {
      await prisma.wordListItem.upsert({
        where: {
          wordListId_vocabularyWordId: {
            wordListId: targetListId,
            vocabularyWordId: item.vocabularyWordId,
          },
        },
        update: {},
        create: {
          wordListId: targetListId,
          vocabularyWordId: item.vocabularyWordId,
        },
      });
    }

    if (deleteSource) {
      await prisma.wordList.delete({
        where: { id: sourceListId },
      });
    }

    return NextResponse.json({
      success: true,
      mergedCount: sourceList.items.length,
    });
  } catch (error: any) {
    console.error("Merge lists error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
