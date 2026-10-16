import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/services/tts_provider";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, language } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    const lang = language || "hi";
    const result = await synthesizeSpeech({
      text: text.trim(),
      language: lang,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("TTS Route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
