"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Target, Award, Clock, Brain, ArrowRight, ArrowLeft,
  CheckCircle2, Sparkles, Zap, AlertCircle
} from "lucide-react";

type LangCode = "en" | "hi" | "mr";
type Cefr = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const LANGUAGES: { code: LangCode; name: string; native: string; flag: string }[] = [
  { code: "en", name: "English", native: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", native: "हिंदी", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", native: "मराठी", flag: "🇮🇳" },
];

const LEVELS: { id: Cefr; title: string; desc: string }[] = [
  { id: "A1", title: "A1 Beginner", desc: "Basic phrases and everyday greetings." },
  { id: "A2", title: "A2 Elementary", desc: "Common expressions and daily routines." },
  { id: "B1", title: "B1 Intermediate", desc: "Work, school, leisure and travel conversations." },
  { id: "B2", title: "B2 Upper-Intermediate", desc: "Complex ideas and fluent interactions." },
  { id: "C1", title: "C1 Advanced", desc: "Professional, academic, and flexible language use." },
  { id: "C2", title: "C2 Mastery", desc: "Near-native precision, nuances, and idioms." },
];

const GOALS = [
  { count: 10, title: "Casual", time: "5 min/day" },
  { count: 20, title: "Standard", time: "15 min/day" },
  { count: 30, title: "Serious", time: "25 min/day" },
  { count: 50, title: "Intense", time: "40 min/day" },
];

const TOTAL_STEPS = 5;

function langLabel(code: LangCode) {
  const l = LANGUAGES.find((x) => x.code === code)!;
  return `${l.flag} ${l.name}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const submittingRef = useRef(false);

  // Form states
  const [nativeLanguage, setNativeLanguage] = useState<LangCode>("en");
  const [targetLanguage, setTargetLanguage] = useState<LangCode>("hi");
  const [cefrLevel, setCefrLevel] = useState<Cefr>("A1");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [algorithm, setAlgorithm] = useState<"SM2" | "FSRS">("SM2");

  // Prefill with previously saved preferences (when re-running onboarding)
  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        const isLang = (v: unknown): v is LangCode => v === "en" || v === "hi" || v === "mr";
        if (isLang(p.nativeLanguage)) setNativeLanguage(p.nativeLanguage);
        if (isLang(p.targetLanguage)) setTargetLanguage(p.targetLanguage);
        if (p.cefrLevel) setCefrLevel(p.cefrLevel);
        if (typeof p.dailyGoal === "number" && GOALS.some((g) => g.count === p.dailyGoal)) {
          setDailyGoal(p.dailyGoal);
        }
        if (p.algorithm === "SM2" || p.algorithm === "FSRS") setAlgorithm(p.algorithm);
        setIsReturning(Boolean(p.onboarded));
      })
      .catch(() => {});
  }, []);

  const handleNativeSelect = (code: LangCode) => {
    setNativeLanguage(code);
  };

  const handleFinish = async () => {
    if (submittingRef.current) return; // guard against double-click
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nativeLanguage, targetLanguage, cefrLevel, dailyGoal, algorithm }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save your preferences.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Something went wrong. Please try again.");
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-8 sm:p-10 bg-slate-900/90 border-white/10 shadow-2xl relative">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
            {isReturning ? "Update learning preferences" : "Welcome — let's personalise ROSP"}
          </h1>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? "w-8 bg-indigo-500" : i < step ? "w-3 bg-indigo-400/50" : "w-3 bg-slate-800"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-400">Step {step} of {TOTAL_STEPS}</span>
        </div>

        {/* Step 1: Native Language */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">What is your native language?</h2>
                <p className="text-xs text-slate-400">Explanations and translations will use this language.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  id={`onboarding-native-${lang.code}`}
                  type="button"
                  onClick={() => handleNativeSelect(lang.code)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    nativeLanguage === lang.code
                      ? "border-indigo-500 bg-indigo-600/20 text-white ring-1 ring-indigo-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                  <span className="text-[11px] text-slate-400">{lang.native}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Target Language */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center border border-violet-500/20">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Which language are you learning?</h2>
                <p className="text-xs text-slate-400">Master English (Oxford/GRE), Hindi, or Marathi vocabulary.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  id={`onboarding-target-${lang.code}`}
                  type="button"
                  onClick={() => setTargetLanguage(lang.code)}
                  className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    targetLanguage === lang.code
                      ? "border-violet-500 bg-violet-600/20 text-white ring-1 ring-violet-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span className="text-sm">{lang.name}</span>
                  <span className="text-[11px] text-slate-400">
                    {lang.code === "en" ? "Oxford / GRE / Vocab" : lang.native}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: CEFR Level */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Your {LANGUAGES.find((l) => l.code === targetLanguage)!.name} level</h2>
                <p className="text-xs text-slate-400">We calibrate your starter deck and recommendations to this level.</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl.id}
                  id={`onboarding-level-${lvl.id}`}
                  type="button"
                  onClick={() => setCefrLevel(lvl.id)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    cefrLevel === lvl.id
                      ? "border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold text-white">{lvl.title}</div>
                    <div className="text-[11px] text-slate-400">{lvl.desc}</div>
                  </div>
                  {cefrLevel === lvl.id && <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Daily Goal */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Set your daily review goal</h2>
                <p className="text-xs text-slate-400">This drives the progress ring and streaks on your dashboard.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.count}
                  id={`onboarding-goal-${g.count}`}
                  type="button"
                  onClick={() => setDailyGoal(g.count)}
                  className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
                    dailyGoal === g.count
                      ? "border-emerald-500 bg-emerald-500/10 text-white ring-1 ring-emerald-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-2xl font-black text-white">{g.count}</div>
                  <div className="text-xs font-semibold text-emerald-300 mt-1">{g.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{g.time}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Algorithm Selection + Summary */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Choose your spaced repetition engine</h2>
                <p className="text-xs text-slate-400">Both algorithms calculate optimal memory review intervals.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <button
                id="onboarding-algo-sm2"
                type="button"
                onClick={() => setAlgorithm("SM2")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  algorithm === "SM2"
                    ? "border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500"
                    : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    SuperMemo SM2 (Classic)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  The classic algorithm used by Anki. Adapts intervals using repetition count and ease factor.
                </p>
              </button>

              <button
                id="onboarding-algo-fsrs"
                type="button"
                onClick={() => setAlgorithm("FSRS")}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  algorithm === "FSRS"
                    ? "border-indigo-500 bg-indigo-500/10 text-white ring-1 ring-indigo-500"
                    : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="h-4 w-4 text-violet-400" />
                    FSRS (Free Spaced Repetition Scheduler)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-500/30">
                    Modern
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Models Difficulty, Stability and Retrievability to target 90% retention.
                </p>
              </button>
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 grid grid-cols-2 gap-y-2 text-xs">
              <span className="text-slate-400">Native</span>
              <span className="text-white font-semibold text-right">{langLabel(nativeLanguage)}</span>
              <span className="text-slate-400">Learning</span>
              <span className="text-white font-semibold text-right">{langLabel(targetLanguage)}</span>
              <span className="text-slate-400">Level</span>
              <span className="text-white font-semibold text-right">{cefrLevel}</span>
              <span className="text-slate-400">Daily goal</span>
              <span className="text-white font-semibold text-right">{dailyGoal} reviews</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
          {step > 1 ? (
            <button
              id="onboarding-back"
              type="button"
              onClick={() => setStep(step - 1)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : isReturning ? (
            <button
              id="onboarding-cancel"
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              id="onboarding-continue"
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              id="onboarding-finish"
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading ? "Setting up your deck..." : isReturning ? "Save Preferences" : "Launch Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
