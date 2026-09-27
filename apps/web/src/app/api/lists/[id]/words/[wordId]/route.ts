import { NextRequest, NextResponse } from "next/server";
import prisma from "@rosp/db";
import { getCurrentUser } from "@/lib/auth/auth";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; wordId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify list ownership
    const list = await prisma.wordList.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    await prisma.wordListItem.deleteMany({
      where: {
        wordListId: params.id,
        vocabularyWordId: params.wordId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Server Error" }, { status: 500 });
  }
}
