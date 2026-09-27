"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Flame,
  Zap,
  Trophy,
  Target,
  Clock,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Play,
  Plus,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  Search,
} from "lucide-react";
import type { DashboardStats, RecommendedWordItem, WeakWordItem } from "@/lib/services/user_service";

interface DashboardClientProps {
  userName?: string | null;
  initialStats: DashboardStats;
}

export function DashboardClient({ userName, initialStats }: DashboardClientProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const dailyProgress = Math.min(
    100,
    Math.round((stats.reviewsCompletedToday / stats.dailyGoal) * 100)
  );

  // SVG circular ring calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (dailyProgress / 100) * circumference;

  const handleAddRecommended = async (word: RecommendedWordItem) => {
    if (addedIds.has(word.id) || addingId === word.id) return;
    setAddingId(word.id);
    try {
      const res = await fetch("/api/user/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyWordId: word.id }),
      });
      if (res.ok) {
        setAddedIds((prev) => new Set([...prev, word.id]));
        setStats((prev) => ({
          ...prev,
          totalWords: prev.totalWords + 1,
          wordsDueToday: prev.wordsDueToday + 1,
        }));
      }
    } catch (err) {
      console.error("Failed to add recommended word:", err);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-10 space-y-10">
      {/* Top Gamification Bar */}
      <div className="glass-panel rounded-3xl p-6 bg-slate-900/80 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          {/* User & Level Info */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Welcome back, {userName || "Learner"}!
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
                  <Trophy className="h-3 w-3" />
                  Level {stats.level}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Keep daily spaced reviews active to maximize long-term retention.
              </p>
            </div>
          </div>

          {/* Gamified Stats Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Streak */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-950/70 border border-orange-500/20 px-4 py-2.5 shadow-inner">
              <div className="h-8 w-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Flame className="h-4 w-4 fill-current animate-pulse" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Streak</div>
                <div className="text-base font-extrabold text-orange-400 leading-none">
                  {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
                </div>
              </div>
            </div>

            {/* Total XP */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-950/70 border border-amber-500/20 px-4 py-2.5 shadow-inner">
              <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="h-4 w-4 fill-current" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total XP</div>
                <div className="text-base font-extrabold text-amber-300 leading-none">
                  {stats.xp} pts
                </div>
              </div>
            </div>

            {/* Retention Rate */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-slate-950/70 border border-emerald-500/20 px-4 py-2.5 shadow-inner">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Retention</div>
                <div className="text-base font-extrabold text-emerald-400 leading-none">
                  {stats.retentionRate}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Level XP Progress Bar */}
        <div className="mt-6 pt-5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="font-semibold text-indigo-300">Level {stats.level} Scholar</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">
              {stats.xpInCurrentLevel} / {stats.xpNeededForNextLevel} XP to Level {stats.level + 1}
            </span>
          </div>
          <div className="w-full sm:w-64 h-2 rounded-full bg-slate-950 overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500"
              style={{ width: `${(stats.xpInCurrentLevel / stats.xpNeededForNextLevel) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hero Section: Daily Goal Circular Progress & Review CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Goal Circular Card */}
        <div className="glass-panel rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-500/30 transition-all">
          <div className="relative flex items-center justify-center">
            <svg className="w-28 h-28 -rotate-90 transform">
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-slate-800"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                className="stroke-indigo-500 transition-all duration-1000 ease-out"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-extrabold text-white">{dailyProgress}%</span>
              <span className="text-[10px] text-slate-400 font-medium">Goal</span>
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-base font-bold text-white">Daily Review Goal</h2>
              {dailyProgress >= 100 && (
                <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">
                  ✓
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mb-3">
              {stats.reviewsCompletedToday} of {stats.dailyGoal} cards reviewed today.
            </p>
            <div className="text-[11px] font-medium text-indigo-300">
              {dailyProgress >= 100
                ? "🎉 Daily target achieved! Excellent dedication."
                : `${stats.dailyGoal - stats.reviewsCompletedToday} more cards to hit your daily goal.`}
            </div>
          </div>
        </div>

        {/* Start Review Session CTA */}
        <div className="lg:col-span-2 glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-indigo-900/30 via-slate-900/60 to-purple-900/20 border border-indigo-500/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-2 relative z-10 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              SM2 / FSRS Memory Engine
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              {stats.wordsDueToday > 0
                ? `${stats.wordsDueToday} Words Due for Review`
                : "All Reviews Complete!"}
            </h2>
            <p className="text-xs text-slate-300 max-w-md leading-relaxed">
              {stats.wordsDueToday > 0
                ? "Reinforce your memory with AI-generated exercises and spaced repetition scheduling before words fade."
                : "You have reviewed all scheduled cards for now. Practice weak words or add new vocabulary below to keep growing."}
            </p>
          </div>

          <Link
            href="/review"
            className="relative z-10 shrink-0 inline-flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-600/40 hover:bg-indigo-500 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Play className="h-4 w-4 fill-current" />
            {stats.wordsDueToday > 0 ? "Start Review Session" : "Practice Anytime"}
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Words due today */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Cards Due</span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {stats.wordsDueToday}
            </span>
            <span className="text-xs text-slate-500">ready to review</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            {stats.wordsDueToday > 0 ? "Optimal interval for recall" : "No pending items right now"}
          </div>
        </div>

        {/* Mastered Words */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Words Mastered</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {stats.wordsLearned}
            </span>
            <span className="text-xs text-slate-500">stable memory</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Intervals extended beyond 7+ days
          </div>
        </div>

        {/* Total In Vault */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total In Vault</span>
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-white">
              {stats.totalWords}
            </span>
            <span className="text-xs text-slate-500">active words</span>
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Enrolled across your personalized lists
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Weak Words & Recommended Vocabulary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weak Words Section */}
        <div className="glass-panel rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Words Needing Reinforcement</h3>
                  <p className="text-xs text-slate-400">Challenging items identified by recall ratings</p>
                </div>
              </div>
              {stats.weakWords.length > 0 && (
                <Link
                  href="/review"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Practice Now
                </Link>
              )}
            </div>

            {stats.weakWords.length > 0 ? (
              <div className="space-y-3 mt-4">
                {stats.weakWords.map((w) => (
                  <div
                    key={w.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between hover:border-red-500/30 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{w.word}</span>
                        {w.cefrLevel && (
                          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                            {w.cefrLevel}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{w.meaning}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold text-red-400/90 block">
                        {w.lastRating === 1 ? "Rating: Again" : w.lastRating === 2 ? "Rating: Hard" : "Low Interval"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {typeof w.interval === "number" ? `${w.interval.toFixed(1)}d interval` : "New word"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/30 border border-white/5 mt-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-white">No Weak Words Detected!</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Your recall scores are solid. Keep reviewing on schedule to preserve high retention.
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Algorithm: SM2 / FSRS Adaptive</span>
            <Link
              href="/review"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Start Practice Session
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Recommended Words Section */}
        <div className="glass-panel rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Recommended Vocabulary</h3>
                  <p className="text-xs text-slate-400">Curated high-frequency words for your level</p>
                </div>
              </div>
              <Link
                href="/vocabulary"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Browse All
              </Link>
            </div>

            {stats.recommendedWords.length > 0 ? (
              <div className="space-y-3 mt-4">
                {stats.recommendedWords.map((word) => {
                  const isAdded = addedIds.has(word.id);
                  const isAdding = addingId === word.id;

                  return (
                    <div
                      key={word.id}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between hover:border-indigo-500/30 transition-all"
                    >
                      <div className="pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{word.word}</span>
                          {word.cefrLevel && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
                              {word.cefrLevel}
                            </span>
                          )}
                          {word.partOfSpeech && (
                            <span className="text-[10px] text-slate-500 uppercase font-medium">
                              {word.partOfSpeech}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{word.meaning}</p>
                      </div>

                      <button
                        onClick={() => handleAddRecommended(word)}
                        disabled={isAdded || isAdding}
                        className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          isAdded
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:scale-95 cursor-pointer"
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Added
                          </>
                        ) : isAdding ? (
                          "Adding..."
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            Add to Study
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-2xl bg-slate-950/30 border border-white/5 mt-4">
                <BookOpen className="h-8 w-8 text-indigo-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-semibold text-white">All Recommendations Enrolled</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  You have enrolled all standard recommendations. Browse the catalog to explore more.
                </p>
              </div>
            )}
          </div>

          <div className="pt-6 mt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
            <span>Oxford 3000 / NGSL Lexicon</span>
            <Link
              href="/vocabulary"
              className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Open Vocabulary Vault
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/lists"
          className="glass-panel rounded-2xl p-6 hover:border-indigo-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Word Lists & Anki Import</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Drag-and-drop words between lists, merge collections, or import existing Anki decks (.apkg, CSV, TSV).
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
            Manage Lists <ArrowRight className="h-3 w-3" />
          </span>
        </Link>

        <Link
          href="/vocabulary"
          className="glass-panel rounded-2xl p-6 hover:border-violet-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
              <Search className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Vocabulary Vault</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Explore canonical CEFR words (A1 to C2) with definitions, sentence examples, or add custom entries.
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-400 group-hover:text-violet-300">
            Explore Words <ArrowRight className="h-3 w-3" />
          </span>
        </Link>

        <Link
          href="/review"
          className="glass-panel rounded-2xl p-6 hover:border-amber-500/40 hover:-translate-y-0.5 transition-all group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Play className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-white">AI Spaced Practice</h3>
          </div>
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Engage with fill-in-blank, multiple choice, and sentence assembly exercises generated on the fly.
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 group-hover:text-amber-300">
            Start Reviewing <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      </div>
    </div>
  );
}
