import Link from "next/link";
import { ArrowLeft, Brain, Sparkles, CheckCircle2, RotateCcw, ThumbsUp, Zap } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { getDueReviews } from "@/lib/services/review_service";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const user = await getCurrentUser();
  const dueReviews = user ? await getDueReviews(user.id, 5).catch(() => []) : [];
  const currentCard = dueReviews[0];

  return (
    <div className="mx-auto max-w-4xl w-full px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>

      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300 mb-3">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Active Review Session ({dueReviews.length} due)</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Spaced Repetition Review</h1>
        <p className="text-sm text-slate-400 mt-1">
          Algorithmic scheduling (SM2 / FSRS) calculates optimal recall intervals.
        </p>
      </div>

      {/* Flashcard / Exercise Container */}
      <div className="glass-panel rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto w-full relative overflow-hidden shadow-2xl border-white/10">
        <div className="absolute top-4 right-4 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/5">
          {currentCard?.learningState?.algorithm || "SM2"}
        </div>

        {currentCard ? (
          <div>
            <span className="text-xs uppercase tracking-wider text-indigo-400 font-semibold">
              {currentCard.vocabularyWord.partOfSpeech || "vocabulary word"}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mt-3 mb-4 tracking-tight">
              {currentCard.vocabularyWord.word}
            </h2>
            <p className="text-slate-300 text-base sm:text-lg italic mb-6">
              &quot;{currentCard.vocabularyWord.example || "No example provided"}&quot;
            </p>

            <div className="border-t border-white/10 pt-6 mt-6">
              <p className="text-sm font-medium text-slate-400 mb-1">Meaning</p>
              <p className="text-slate-200 text-base font-normal">
                {currentCard.vocabularyWord.meaning}
              </p>
            </div>
          </div>
        ) : (
          <div className="py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-2xl font-bold text-white">All Caught Up!</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-xs mx-auto">
              You have reviewed all due cards for now. Return later as the algorithm schedules new intervals.
            </p>
          </div>
        )}
      </div>

      {/* Rating actions bar */}
      {currentCard && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 max-w-lg mx-auto w-full">
          <button
            type="button"
            className="flex-1 min-w-[90px] py-2.5 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-semibold hover:bg-red-500/20 transition-all cursor-pointer text-center"
          >
            Again (1)
          </button>
          <button
            type="button"
            className="flex-1 min-w-[90px] py-2.5 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-semibold hover:bg-amber-500/20 transition-all cursor-pointer text-center"
          >
            Hard (2)
          </button>
          <button
            type="button"
            className="flex-1 min-w-[90px] py-2.5 px-3 rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs font-semibold hover:bg-blue-500/20 transition-all cursor-pointer text-center"
          >
            Good (3)
          </button>
          <button
            type="button"
            className="flex-1 min-w-[90px] py-2.5 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer text-center"
          >
            Easy (4)
          </button>
        </div>
      )}
    </div>
  );
}
