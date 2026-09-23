import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/auth";
import { getDueReviews, processReviewSubmission } from "@/lib/services/review_service";
import { ReviewSubmissionSchema } from "@rosp/shared";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dueReviews = await getDueReviews(user.id);
    return NextResponse.json({ reviews: dueReviews });
  } catch (error) {
    console.error("Failed to fetch due reviews:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ReviewSubmissionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await processReviewSubmission(user.id, parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Failed to process review submission:", error);
    return NextResponse.json(
      { error: error?.message || "Internal Server Error" },
      { status: 400 }
    );
  }
}
