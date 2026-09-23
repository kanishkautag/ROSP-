import Link from "next/link";
import { ArrowRight, Brain, Clock, Sparkles, BookOpen, Layers, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative isolate overflow-hidden flex-1 flex flex-col justify-center items-center px-4 py-16 sm:py-24">
      {/* Background glow effects */}
      <div
        className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80 pointer-events-none"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-indigo-600 to-violet-400 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300 mb-8 backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
          <span>Next-Generation Spaced Repetition Platform</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          AI Assisted Language Learning
        </h1>

        <p className="mt-6 text-lg sm:text-xl leading-8 text-slate-300 max-w-2xl mx-auto font-normal">
          Learn vocabulary. Practice with AI. Review at the right time.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all hover:scale-105 active:scale-95"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all backdrop-blur-sm"
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* Feature Pillars */}
      <div className="mx-auto mt-20 max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/40 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 border border-indigo-500/20">
            <Clock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Adaptive Spaced Repetition</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Pluggable algorithmic schedulers supporting classic SuperMemo SM2 and next-generation FSRS memory modeling.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-violet-500/40 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-400 mb-4 border border-violet-500/20">
            <Zap className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Contextual AI Exercises</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Dynamic exercises powered by Ollama or Groq, generating fill-in-the-blanks, multiple-choice, and sentence construction.
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 border border-blue-500/20">
            <Layers className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Modular Vocabulary Vault</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Relational multi-list membership with CEFR proficiency tracking, frequency ranks, and append-only review metrics.
          </p>
        </div>
      </div>
    </div>
  );
}
