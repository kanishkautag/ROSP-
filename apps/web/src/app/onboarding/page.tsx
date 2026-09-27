"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Target, Award, Clock, Brain, ArrowRight, ArrowLeft,
  CheckCircle2, Sparkles, Zap
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form states
  const [nativeLanguage, setNativeLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [cefrLevel, setCefrLevel] = useState<"A1" | "A2" | "B1" | "B2" | "C1" | "C2">("B1");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [algorithm, setAlgorithm] = useState<"SM2" | "FSRS">("SM2");

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "zh", name: "Mandarin", flag: "🇨🇳" },
  ];

  const levels = [
    { id: "A1", title: "A1 Beginner", desc: "Basic phrases and everyday greetings." },
    { id: "A2", title: "A2 Elementary", desc: "Common expressions and daily routines." },
    { id: "B1", title: "B1 Intermediate", desc: "Work, school, leisure and travel conversations." },
    { id: "B2", title: "B2 Upper-Intermediate", desc: "Complex ideas and fluent interactions." },
    { id: "C1", title: "C1 Advanced", desc: "Professional, academic, and flexible language use." },
    { id: "C2", title: "C2 Mastery", desc: "Near-native precision, nuances, and idioms." },
  ];

  const goals = [
    { count: 10, title: "Casual", time: "5 min/day" },
    { count: 20, title: "Standard", time: "15 min/day" },
    { count: 30, title: "Serious", time: "25 min/day" },
    { count: 50, title: "Intense", time: "40 min/day" },
  ];

  const handleFinish = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nativeLanguage,
          targetLanguage,
          cefrLevel,
          dailyGoal,
          algorithm,
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        alert("Failed to save preferences. Continuing to dashboard...");
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-12">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-8 sm:p-10 bg-slate-900/90 border-white/10 shadow-2xl relative">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-indigo-500"
                    : i < step
                    ? "w-3 bg-indigo-400/50"
                    : "w-3 bg-slate-800"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-400">Step {step} of 5</span>
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
                <p className="text-xs text-slate-400">We will provide translations and explanations in this tongue.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setNativeLanguage(lang.code)}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                    nativeLanguage === lang.code
                      ? "border-indigo-500 bg-indigo-600/20 text-white ring-1 ring-indigo-500"
                      : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <span className="text-xl">{lang.flag}</span>
                  <span>{lang.name}</span>
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
                <p className="text-xs text-slate-400">Your exercises and spaced repetition lists will target this language.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {languages
                .filter((l) => l.code !== nativeLanguage)
                .map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setTargetLanguage(lang.code)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                      targetLanguage === lang.code
                        ? "border-violet-500 bg-violet-600/20 text-white ring-1 ring-violet-500"
                        : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span>{lang.name}</span>
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
                <h2 className="text-xl font-bold text-white">Select your proficiency level</h2>
                <p className="text-xs text-slate-400">We will calibrate vocabulary recommendations to this standard.</p>
              </div>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {levels.map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setCefrLevel(lvl.id as any)}
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
                <p className="text-xs text-slate-400">Regular short habits lead to lasting retention streaks.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {goals.map((g) => (
                <button
                  key={g.count}
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

        {/* Step 5: Algorithm Selection */}
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

            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => setAlgorithm("SM2")}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
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
                  The classic standard algorithm used by Anki for decades. Adapts interval progression based on repetition count and card ease factor.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setAlgorithm("FSRS")}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
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
                  Modern memory model optimizing for target retention (90%) by modeling Difficulty, Stability, and Retrievability decay curves.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-5 border-t border-white/10 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              {loading ? "Configuring..." : "Launch Dashboard"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
