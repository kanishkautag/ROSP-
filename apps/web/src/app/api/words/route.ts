import { NextRequest, NextResponse } from "next/server";
import { searchVocabularyWords, createVocabularyWord } from "@/lib/services/vocabulary_service";
import { CreateVocabularyWordSchema, VocabularyWordQuerySchema } from "@rosp/shared";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsedQuery = VocabularyWordQuerySchema.safeParse({
      query: searchParams.get("query") ?? undefined,
      language: searchParams.get("language") ?? undefined,
      cefrLevel: searchParams.get("cefrLevel") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsedQuery.error.format() },
        { status: 400 }
      );
    }

    const result = await searchVocabularyWords(parsedQuery.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to query vocabulary words (temporary database connection issue):", error);
    return NextResponse.json({
      words: [],
      total: 0,
      page: 1,
      totalPages: 0,
      warning: "Database is temporarily reconnecting",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateVocabularyWordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const newWord = await createVocabularyWord(parsed.data);
    return NextResponse.json({ word: newWord }, { status: 201 });
  } catch (error) {
    console.error("Failed to create vocabulary word:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
