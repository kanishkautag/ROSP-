import { NextRequest, NextResponse } from "next/server";
import { lookupWordOnline, saveEntryToVault } from "@/lib/services/dictionary_lookup_service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query");
    const language = searchParams.get("language") || undefined;

    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 });
    }

    const entry = await lookupWordOnline(query, language);

    if (!entry) {
      return NextResponse.json(
        { found: false, message: `Could not find definition for "${query}"` },
        { status: 404 }
      );
    }

    return NextResponse.json({ found: true, entry });
  } catch (error: any) {
    console.error("Dictionary lookup route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error during dictionary lookup" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.word || !body.meaning) {
      return NextResponse.json(
        { error: "Word and meaning are required to save to vault" },
        { status: 400 }
      );
    }

    const saved = await saveEntryToVault({
      word: body.word,
      language: body.language || "en",
      meaning: body.meaning,
      example: body.example,
      partOfSpeech: body.partOfSpeech,
      cefrLevel: body.cefrLevel,
      source: body.source || "Oxford & Cambridge Open Lexicon",
    });

    return NextResponse.json({ success: true, word: saved }, { status: 201 });
  } catch (error: any) {
    console.error("Save dictionary word route error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save dictionary word to vault" },
      { status: 500 }
    );
  }
}
