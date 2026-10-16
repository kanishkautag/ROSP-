import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { unifiedDictionaryService } from "@/lib/services/dictionary/unified_dictionary_service";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const listItem = await unifiedDictionaryService.addWordToPersonalList(
      user.id,
      params.id,
      {
        vocabularyWordId: body.vocabularyWordId,
        word: body.word,
        meaning: body.meaning,
        example: body.example,
        partOfSpeech: body.partOfSpeech,
        cefrLevel: body.cefrLevel,
        language: body.language,
        canPersist: body.canPersist,
        source: body.source,
      }
    );

    return NextResponse.json({ success: true, item: listItem }, { status: 201 });
  } catch (error: any) {
    console.error("Error adding word to personal list:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: error?.message?.includes("unauthorized") ? 403 : 500 }
    );
  }
}
