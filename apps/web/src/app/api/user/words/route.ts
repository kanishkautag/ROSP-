import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { addWordToStudy } from "@/lib/services/user_service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { vocabularyWordId } = body;

    if (!vocabularyWordId || typeof vocabularyWordId !== "string") {
      return NextResponse.json(
        { error: "vocabularyWordId is required" },
        { status: 400 }
      );
    }

    const result = await addWordToStudy(user.id, vocabularyWordId);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Failed to add word to study:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
