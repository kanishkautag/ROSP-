import Link from "next/link";
import { Flame, Clock, CheckCircle2, BookOpen, ArrowRight, Play, Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { getDashboardStats } from "@/lib/services/user_service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const stats = user
    ? await getDashboardStats(user.id).catch(() => ({
        wordsDueToday: 0,
        currentStreak: 0,
        wordsLearned: 0,
        totalWords: 0,
      }))
    : {
        wordsDueToday: 0,
        currentStreak: 0,
        wordsLearned: 0,
        totalWords: 0,
      };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-10">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Welcome back{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Here is your language learning progress for today. Keep up the momentum!
          </p>
        </div>

        <Link
          href="/review"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95"
        >
          <Play className="h-4 w-4 fill-current" />
          Start Review
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
        {/* Words due today */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Words due today</span>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {stats.wordsDueToday}
            </span>
            <span className="text-xs text-slate-500">cards ready</span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            {stats.wordsDueToday > 0 ? "Review items to reinforce memory" : "All caught up for today!"}
          </div>
        </div>

        {/* Current streak */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Current streak</span>
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {stats.currentStreak}
            </span>
            <span className="text-xs text-slate-500">days</span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Daily practice builds lasting fluency
          </div>
        </div>

        {/* Words learned */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Words learned</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-white">
              {stats.wordsLearned}
            </span>
            <span className="text-xs text-slate-500">mastered words</span>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            Retained through spaced intervals
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-white">Vocabulary Collections</h2>
          </div>
          <p className="text-sm text-slate-400 mb-5">
            Organize vocabulary into structured lists like English Basics, business terminology, or travel phrases.
          </p>
          <Link
            href="/lists"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            Manage Word Lists
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <h2 className="text-base font-semibold text-white">AI Spaced Repetition</h2>
          </div>
          <p className="text-sm text-slate-400 mb-5">
            Review sessions adaptively calculated via SM2 or FSRS algorithms with contextual exercises generated on demand.
          </p>
          <Link
            href="/review"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors"
          >
            Go to Review Session
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
