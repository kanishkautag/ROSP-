import { NextRequest, NextResponse } from "next/server";
import { generateExerciseForWord } from "@/lib/services/exercise_service";
import { ExerciseRequestSchema } from "@rosp/shared";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ExerciseRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const exercise = await generateExerciseForWord(parsed.data);
    return NextResponse.json({ exercise }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to generate exercise:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 400 }
    );
  }
}
