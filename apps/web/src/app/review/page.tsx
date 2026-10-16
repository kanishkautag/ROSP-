"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Brain, Sparkles, CheckCircle2, XCircle, ArrowLeft,
  Volume2, RotateCcw, Award, Zap, HelpCircle, ArrowRight,
  Check, Eye, EyeOff, Bot, MessageSquare, SkipForward, Globe
} from "lucide-react";
import { AiTutorDrawer } from "@/components/ai_tutor_drawer";
import { speakWord } from "@/lib/utils/tts";

interface VocabularyWord {
  id: string;
  word: string;
  language: string;
  romanization?: string | null;
  meaning: string;
  nativeDefinition?: string | null;
  gender?: string | null;
  forms?: string | null;
  example?: string | null;
  exampleTranslation?: string | null;
  topic?: string | null;
  difficulty?: string | null;
  partOfSpeech?: string | null;
  cefrLevel?: string | null;
  pronunciationUrl?: string | null;
}

interface LearningState {
  algorithm: string;
  interval?: number | null;
  easeFactor?: number | null;
  repetitions?: number | null;
}

interface DueReview {
  id: string; // userWordId
  vocabularyWord: VocabularyWord;
  learningState?: LearningState | null;
}

interface Exercise {
  id?: string;
  type: "FILL_BLANK" | "MULTIPLE_CHOICE" | "SENTENCE_CONSTRUCTION";
  question: string;
  options?: string[];
  answer: string;
  explanation?: string | null;
}

const LANGUAGE_CONFIG: Record<string, { label: string; flag: string }> = {
  ALL: { label: "All Languages", flag: "🌐" },
  hi: { label: "Hindi (हिंदी)", flag: "🇮🇳" },
  mr: { label: "Marathi (मराठी)", flag: "🇮🇳" },
  en: { label: "English", flag: "🇬🇧" },
  es: { label: "Spanish", flag: "🇪🇸" },
  fr: { label: "French", flag: "🇫🇷" },
  de: { label: "German", flag: "🇩🇪" },
  ja: { label: "Japanese", flag: "🇯🇵" },
};

function ReviewSessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlLang = searchParams?.get("lang") || searchParams?.get("language") || "ALL";
  const urlMode = (searchParams?.get("mode") as "due" | "all") || "due";
  const urlListId = searchParams?.get("listId") || undefined;

  const [selectedLanguage, setSelectedLanguage] = useState<string>(urlLang);
  const [reviewMode, setReviewMode] = useState<"due" | "all">(urlMode);
  const [countsByLanguage, setCountsByLanguage] = useState<Record<string, { due: number; total: number }>>({});

  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Exercise & Flashcard state
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [selectedTokenIndices, setSelectedTokenIndices] = useState<number[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [directRatingMode, setDirectRatingMode] = useState(false);

  // AI Tutor Drawer
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);

  // Session summary stats
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const fetchReviews = async (
    targetLang: string = selectedLanguage,
    targetMode: "due" | "all" = reviewMode
  ) => {
    setLoading(true);
    setCurrentIndex(0);
    setSessionCompleted(false);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (targetLang && targetLang !== "ALL") {
        params.set("language", targetLang);
      }
      if (targetMode) {
        params.set("mode", targetMode);
      }
      if (urlListId) {
        params.set("listId", urlListId);
      }

      const res = await fetch(`/api/reviews?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        if (data.countsByLanguage) {
          setCountsByLanguage(data.countsByLanguage);
        }
      }
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(selectedLanguage, reviewMode);
  }, [selectedLanguage, reviewMode]);

  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    if (newLang === "ALL") {
      newParams.delete("lang");
      newParams.delete("language");
    } else {
      newParams.set("lang", newLang);
    }
    router.replace(`/review?${newParams.toString()}`);
  };

  const handleModeChange = (newMode: "due" | "all") => {
    setReviewMode(newMode);
    const newParams = new URLSearchParams(searchParams?.toString() || "");
    newParams.set("mode", newMode);
    router.replace(`/review?${newParams.toString()}`);
  };

  const currentCard = reviews[currentIndex];

  // Fetch or generate exercise whenever current card changes
  useEffect(() => {
    if (!currentCard) return;

    const loadExercise = async () => {
      setExerciseLoading(true);
      setIsAnswerChecked(false);
      setSelectedOption("");
      setTextAnswer("");
      setSelectedTokenIndices([]);
      setDirectRatingMode(false);

      try {
        const exerciseTypes = ["FILL_BLANK", "MULTIPLE_CHOICE", "SENTENCE_CONSTRUCTION"];
        const randomType = exerciseTypes[Math.floor(Math.random() * exerciseTypes.length)];

        const res = await fetch("/api/exercises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vocabularyWordId: currentCard.vocabularyWord.id,
            type: randomType,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          let ex = data.exercise;
          if (ex && ex.type === "SENTENCE_CONSTRUCTION" && Array.isArray(ex.options)) {
            // Strip trailing punctuation from tokens
            let tokens = ex.options
              .map((t: string) => String(t).replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "").trim())
              .filter(Boolean);

            const cleanAnswer = String(ex.answer || "")
              .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
              .split(/\s+/)
              .filter(Boolean);

            // Always guarantee a true Fisher-Yates shuffle
            let attempts = 0;
            while (attempts < 10) {
              for (let i = tokens.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tokens[i], tokens[j]] = [tokens[j], tokens[i]];
              }
              if (
                tokens.join(" ").toLowerCase() !== cleanAnswer.join(" ").toLowerCase() ||
                tokens.length <= 1
              ) {
                break;
              }
              attempts++;
            }

            // If still same order after 10 attempts, swap adjacent tokens
            if (
              tokens.length > 1 &&
              tokens.join(" ").toLowerCase() === cleanAnswer.join(" ").toLowerCase()
            ) {
              [tokens[0], tokens[1]] = [tokens[1], tokens[0]];
            }

            ex = { ...ex, options: tokens };
          }
          setExercise(ex);
        } else {
          setDirectRatingMode(true);
        }
      } catch (err) {
        console.error("Exercise generation error:", err);
        setDirectRatingMode(true);
      } finally {
        setExerciseLoading(false);
      }
    };

    loadExercise();
  }, [currentIndex, currentCard]);

  const handleCheckAnswer = () => {
    if (!exercise) return;

    let userAnswer = "";
    if (exercise.type === "MULTIPLE_CHOICE") {
      userAnswer = selectedOption;
    } else if (exercise.type === "SENTENCE_CONSTRUCTION") {
      userAnswer = selectedTokenIndices
        .map((i) => exercise.options?.[i] || "")
        .filter(Boolean)
        .join(" ");
    } else {
      userAnswer = textAnswer.trim();
    }

    const cleanUser = userAnswer
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const cleanCorrect = exercise.answer
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const correct =
      cleanUser === cleanCorrect ||
      cleanCorrect.includes(cleanUser) && cleanUser.length > 3;

    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleRateCard = async (rating: number) => {
    if (!currentCard) return;

    try {
      const sentenceAnswer = selectedTokenIndices
        .map((i) => exercise?.options?.[i] || "")
        .filter(Boolean)
        .join(" ");

      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWordId: currentCard.id,
          rating,
          exerciseId: exercise?.id,
          userAnswer:
            selectedOption || textAnswer || sentenceAnswer || "manual-recall",
        }),
      });

      setReviewedCount((prev) => prev + 1);

      if (currentIndex + 1 < reviews.length) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        setSessionCompleted(true);
      }
    } catch (err) {
      console.error("Rating submission error:", err);
    }
  };

  const handleSkipCard = () => {
    if (currentIndex + 1 < reviews.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  // Available languages list from metadata + API counts
  const availableLangs = [
    "ALL",
    ...Object.keys(countsByLanguage).filter((l) => l !== "ALL"),
  ];

  // Render language selection header component
  const renderLanguageBar = () => (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-slate-950/80 border border-white/10 shadow-lg backdrop-blur-md">
      {/* Language filter pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full">
        {availableLangs.map((code) => {
          const config = LANGUAGE_CONFIG[code] || {
            label: code.toUpperCase(),
            flag: "🌐",
          };
          const countInfo = countsByLanguage[code];
          const count = reviewMode === "due" ? countInfo?.due ?? 0 : countInfo?.total ?? 0;
          const isSelected = selectedLanguage === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => handleLanguageChange(code)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]"
                  : "bg-slate-900/90 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              <span>{config.flag}</span>
              <span>{config.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isSelected ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Due vs All Cards Mode Toggle */}
      <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/5 ml-auto">
        <button
          type="button"
          onClick={() => handleModeChange("due")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            reviewMode === "due"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Due Today
        </button>
        <button
          type="button"
          onClick={() => handleModeChange("all")}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
            reviewMode === "all"
              ? "bg-indigo-600 text-white"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Practice All
        </button>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
        {renderLanguageBar()}
        <div className="glass-panel rounded-3xl p-16 text-center border-white/10">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Loading cards for {LANGUAGE_CONFIG[selectedLanguage]?.label || selectedLanguage}...</p>
        </div>
      </div>
    );
  }

  // Session Completion View OR Empty Reviews for selected language
  if (sessionCompleted || reviews.length === 0) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 100;
    const xpGained = reviewedCount * 15;
    const langLabel = LANGUAGE_CONFIG[selectedLanguage]?.label || selectedLanguage;
    const totalAvailable = countsByLanguage[selectedLanguage]?.total ?? 0;

    return (
      <div className="mx-auto max-w-xl w-full px-4 py-10 flex-1 flex flex-col justify-center">
        {renderLanguageBar()}

        <div className="glass-panel rounded-3xl p-8 sm:p-12 border-white/10 shadow-2xl relative overflow-hidden text-center">
          <div className="h-16 w-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5 border border-indigo-500/30">
            {reviewedCount > 0 ? (
              <Award className="h-8 w-8 text-indigo-300" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            )}
          </div>

          <h2 className="text-3xl font-black text-white mb-2">
            {reviewedCount > 0
              ? `${langLabel} Review Complete!`
              : `All Caught Up on ${langLabel}!`}
          </h2>

          <p className="text-sm text-slate-400 mb-8">
            {reviewedCount > 0
              ? "Outstanding dedication! Your memory intervals have been recalibrated using spaced repetition."
              : `You have no cards due for review right now in ${langLabel}. All memory intervals are currently scheduled in the future.`}
          </p>

          {reviewedCount > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="glass-panel rounded-2xl p-4 bg-slate-950/60">
                <span className="text-2xl font-bold text-white">{reviewedCount}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Cards Studied</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 bg-slate-950/60">
                <span className="text-2xl font-bold text-emerald-400">{accuracy}%</span>
                <p className="text-[11px] text-slate-400 mt-0.5">Accuracy</p>
              </div>
              <div className="glass-panel rounded-2xl p-4 bg-slate-950/60">
                <span className="text-2xl font-bold text-amber-400">+{xpGained}</span>
                <p className="text-[11px] text-slate-400 mt-0.5">XP Earned</p>
              </div>
            </div>
          ) : totalAvailable > 0 && reviewMode === "due" ? (
            <div className="mb-8 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-center">
              <p className="text-xs text-indigo-200 mb-3">
                Want to reinforce your memory anyway? You have <strong>{totalAvailable} words</strong> in your {langLabel} vault.
              </p>
              <button
                type="button"
                onClick={() => handleModeChange("all")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4 text-amber-300 fill-amber-300" />
                Practice All {langLabel} Cards ({totalAvailable})
              </button>
            </div>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {/* Quick Switch to alternate language if available */}
            {selectedLanguage !== "hi" && countsByLanguage["hi"]?.total ? (
              <button
                type="button"
                onClick={() => handleLanguageChange("hi")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <span>🇮🇳</span>
                Review Hindi ({countsByLanguage["hi"]?.due || countsByLanguage["hi"]?.total})
              </button>
            ) : null}

            {selectedLanguage !== "mr" && countsByLanguage["mr"]?.total ? (
              <button
                type="button"
                onClick={() => handleLanguageChange("mr")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all cursor-pointer"
              >
                <span>🇮🇳</span>
                Review Marathi ({countsByLanguage["mr"]?.due || countsByLanguage["mr"]?.total})
              </button>
            ) : null}

            {selectedLanguage !== "en" && countsByLanguage["en"]?.total ? (
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <span>🇬🇧</span>
                Review English ({countsByLanguage["en"]?.due || countsByLanguage["en"]?.total})
              </button>
            ) : null}

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate interval previews
  const currentInterval = currentCard?.learningState?.interval ?? 1.0;
  const againDays = 1;
  const hardDays = Math.max(1, Math.round(currentInterval * 1.2));
  const goodDays = Math.max(2, Math.round(currentInterval * 2.5));
  const easyDays = Math.max(3, Math.round(currentInterval * 3.5));

  const isHindiWord =
    currentCard?.vocabularyWord.language === "hi" ||
    /[\u0900-\u097F]/.test(currentCard?.vocabularyWord.word || "");

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
      {/* Language Selector Bar */}
      {renderLanguageBar()}

      {/* Top Controls Bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        {/* Counter and Skip */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAiTutorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
          >
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
            Ask AI Tutor
          </button>

          <button
            onClick={handleSkipCard}
            title="Skip to next card"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Skip <SkipForward className="h-3.5 w-3.5" />
          </button>

          <span className="text-xs font-semibold text-slate-400">
            {currentIndex + 1} / {reviews.length}
          </span>
          <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / reviews.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard & Exercise Container */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border-white/10 shadow-2xl relative">
        {/* Badges Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-wider">
              {currentCard?.learningState?.algorithm || "SM2"}
            </span>

            {/* Language Flag Badge */}
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px] font-bold border border-white/5 flex items-center gap-1">
              <span>{currentCard?.vocabularyWord.language === "hi" ? "🇮🇳" : currentCard?.vocabularyWord.language === "mr" ? "🇮🇳" : "🇬🇧"}</span>
              <span>{currentCard?.vocabularyWord.language === "hi" ? "Hindi" : currentCard?.vocabularyWord.language === "mr" ? "Marathi" : "English"}</span>
            </span>

            {currentCard?.vocabularyWord.topic && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-medium border border-slate-700">
                {currentCard.vocabularyWord.topic}
              </span>
            )}

            {currentCard?.vocabularyWord.gender && (
              <span className="px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-300 text-[10px] font-medium border border-pink-500/20">
                {currentCard.vocabularyWord.gender}
              </span>
            )}

            {currentCard?.vocabularyWord.cefrLevel && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                CEFR {currentCard.vocabularyWord.cefrLevel}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              setDirectRatingMode(!directRatingMode);
              setIsAnswerChecked(false);
            }}
            className="text-[11px] text-slate-400 hover:text-indigo-300 underline transition-colors cursor-pointer"
          >
            {directRatingMode ? "Switch to AI Exercise" : "Flashcard Self-Rating"}
          </button>
        </div>

        {/* Dynamic Exercise / Flashcard Section */}
        <div className="pt-2">
          {exerciseLoading ? (
            <div className="text-center py-12 text-xs text-indigo-300 animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Generating Groq AI challenge...
            </div>
          ) : !directRatingMode && exercise ? (
            <div className="space-y-4">
              {/* Question Banner */}
              <div className="text-sm font-semibold text-slate-200 leading-relaxed bg-slate-950/70 p-5 rounded-2xl border border-white/5 whitespace-pre-wrap">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                    Context Question • {currentCard?.vocabularyWord.partOfSpeech || "Vocabulary Word"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      speakWord(
                        currentCard?.vocabularyWord.word || "",
                        currentCard?.vocabularyWord.language,
                        currentCard?.vocabularyWord.pronunciationUrl
                      )
                    }
                    title="Pronounce prompt word"
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 text-indigo-400 hover:text-white transition-all cursor-pointer shadow-sm"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                {exercise.question}
              </div>

              {/* Type: Multiple Choice */}
              {exercise.type === "MULTIPLE_CHOICE" && exercise.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {exercise.options.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={isAnswerChecked}
                      onClick={() => setSelectedOption(opt)}
                      className={`p-3.5 rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
                        selectedOption === opt
                          ? "border-indigo-500 bg-indigo-600/30 text-white ring-1 ring-indigo-500"
                          : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Type: Fill in the Blank */}
              {exercise.type === "FILL_BLANK" && (
                <div className="space-y-3">
                  {exercise.options && exercise.options.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {exercise.options.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={isAnswerChecked}
                          onClick={() => setTextAnswer(opt)}
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                            textAnswer === opt
                              ? "border-indigo-500 bg-indigo-600/30 text-white"
                              : "border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-700"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input
                      type="text"
                      disabled={isAnswerChecked}
                      placeholder="Type the missing vocabulary word..."
                      value={textAnswer}
                      onChange={(e) => setTextAnswer(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              )}

              {/* Type: Sentence Construction */}
              {exercise.type === "SENTENCE_CONSTRUCTION" && exercise.options && (
                <div className="space-y-4">
                  {/* Sentence Assembly Drop Area */}
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1.5">
                      Your Constructed Sentence:
                    </span>
                    <div className="min-h-[58px] p-3 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/70 flex flex-wrap gap-2 items-center">
                      {selectedTokenIndices.length > 0 ? (
                        selectedTokenIndices.map((tokenIdx, slot) => {
                          const word = exercise.options![tokenIdx];
                          return (
                            <button
                              key={`${tokenIdx}-${slot}`}
                              type="button"
                              disabled={isAnswerChecked}
                              onClick={() => {
                                if (!isAnswerChecked) {
                                  setSelectedTokenIndices((prev) =>
                                    prev.filter((_, idx) => idx !== slot)
                                  );
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-100 border border-indigo-500/50 text-xs font-semibold cursor-pointer hover:bg-red-500/20 hover:border-red-400 hover:text-white transition-all shadow-sm flex items-center gap-1.5 group active:scale-95"
                              title="Click to remove from sentence"
                            >
                              <span>{word}</span>
                              <span className="text-[10px] text-indigo-300 group-hover:text-red-300 font-bold">×</span>
                            </button>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic px-2">
                          Click the shuffled word tiles below in the correct order to construct the sentence
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Word Bank / Pool (Shuffled) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Word Bank (Click to add):
                      </span>
                      {selectedTokenIndices.length > 0 && !isAnswerChecked && (
                        <button
                          type="button"
                          onClick={() => setSelectedTokenIndices([])}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {exercise.options.map((tok, i) => {
                        const isUsed = selectedTokenIndices.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            disabled={isAnswerChecked || isUsed}
                            onClick={() => {
                              if (!isUsed && !isAnswerChecked) {
                                setSelectedTokenIndices((prev) => [...prev, i]);
                              }
                            }}
                            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                              isUsed
                                ? "bg-slate-900/30 border-slate-800/40 text-slate-600 cursor-not-allowed scale-95 opacity-25 pointer-events-none"
                                : "border-slate-700 bg-slate-900 text-slate-200 hover:border-indigo-400 hover:bg-indigo-600/20 hover:text-white shadow-md cursor-pointer active:scale-95"
                            }`}
                          >
                            {tok}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Check Answer Button & Feedback */}
              {!isAnswerChecked ? (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-3 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Verify Answer
                </button>
              ) : (
                <div
                  className={`p-4 rounded-2xl border ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs font-bold">Excellent recall!</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-xs font-bold">Almost there!</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-300">
                    Target answer: <span className="font-bold text-white">&ldquo;{exercise.answer}&rdquo;</span>
                  </p>
                  {exercise.explanation && (
                    <p className="text-[11px] text-slate-400 mt-1 italic">
                      {exercise.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Flashcard Prompt Mode (When directRatingMode is active and not yet flipped) */}
          {directRatingMode && !isAnswerChecked && (
            <div className="text-center py-8 space-y-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 block">
                Flashcard Definition Challenge • {currentCard?.vocabularyWord.partOfSpeech || "Vocabulary Word"}
              </span>
              <p className="text-base sm:text-lg font-medium text-slate-100 max-w-lg mx-auto leading-relaxed">
                &ldquo;{currentCard?.vocabularyWord.meaning}&rdquo;
              </p>
              <button
                type="button"
                onClick={() => setIsAnswerChecked(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-6 py-3 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Eye className="h-4 w-4" />
                Reveal Word & Pronunciation
              </button>
            </div>
          )}

          {/* REVEALED Word Box (Shown ONLY after candidate verifies or flips) */}
          {isAnswerChecked && (
            <div className="text-center my-6 p-6 rounded-2xl bg-slate-950/80 border border-indigo-500/20 shadow-inner">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                Target Word • {currentCard?.vocabularyWord.partOfSpeech || "Word"}
              </span>

              <div className="flex items-center justify-center gap-3 mb-2">
                <div>
                  <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                    {currentCard?.vocabularyWord.word}
                  </h2>
                  {currentCard?.vocabularyWord.romanization && (
                    <p className="text-sm font-mono text-indigo-300 mt-1">
                      {currentCard?.vocabularyWord.romanization}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    speakWord(
                      currentCard?.vocabularyWord.word || "",
                      currentCard?.vocabularyWord.language,
                      currentCard?.vocabularyWord.pronunciationUrl
                    )
                  }
                  title={`Listen to pronunciation (${currentCard?.vocabularyWord.language === "hi" ? "Hindi" : currentCard?.vocabularyWord.language === "mr" ? "Marathi" : "English"})`}
                  className="h-10 w-10 rounded-2xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-indigo-500/30 active:scale-95"
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed mb-2">
                {currentCard?.vocabularyWord.meaning}
              </p>

              {currentCard?.vocabularyWord.nativeDefinition && (
                <p className="text-xs text-slate-400 italic mb-3">
                  {currentCard.vocabularyWord.nativeDefinition}
                </p>
              )}

              {currentCard?.vocabularyWord.example && (
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/5 text-left max-w-lg mx-auto">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-0.5">
                    Contextual Example
                  </span>
                  <p className="text-xs text-slate-200 italic leading-relaxed">
                    &ldquo;{currentCard.vocabularyWord.example}&rdquo;
                  </p>
                  {currentCard.vocabularyWord.exampleTranslation && (
                    <p className="text-[11px] text-slate-400 mt-1">
                      {currentCard.vocabularyWord.exampleTranslation}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Spaced Repetition Self-Rating Buttons (Shown ONLY after answer is verified) */}
          {isAnswerChecked && (
            <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block text-center">
                Rate your recall difficulty (recalibrates algorithm)
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {/* 1: Again */}
                <button
                  type="button"
                  onClick={() => handleRateCard(1)}
                  className="p-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <span className="block text-xs font-bold text-white group-hover:text-red-200">
                    Again (1)
                  </span>
                  <span className="block text-[10px] text-red-400/80 mt-0.5">
                    Reset ({againDays}d)
                  </span>
                </button>

                {/* 2: Hard */}
                <button
                  type="button"
                  onClick={() => handleRateCard(2)}
                  className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <span className="block text-xs font-bold text-white group-hover:text-amber-200">
                    Hard (2)
                  </span>
                  <span className="block text-[10px] text-amber-400/80 mt-0.5">
                    Slow ({hardDays}d)
                  </span>
                </button>

                {/* 3: Good */}
                <button
                  type="button"
                  onClick={() => handleRateCard(3)}
                  className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <span className="block text-xs font-bold text-white group-hover:text-indigo-200">
                    Good (3)
                  </span>
                  <span className="block text-[10px] text-indigo-400/80 mt-0.5">
                    Standard ({goodDays}d)
                  </span>
                </button>

                {/* 4: Easy */}
                <button
                  type="button"
                  onClick={() => handleRateCard(4)}
                  className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-left transition-all active:scale-95 group cursor-pointer"
                >
                  <span className="block text-xs font-bold text-white group-hover:text-emerald-200">
                    Easy (4)
                  </span>
                  <span className="block text-[10px] text-emerald-400/80 mt-0.5">
                    Boost ({easyDays}d)
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lexi AI Tutor Drawer */}
      <AiTutorDrawer
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
        currentWord={currentCard?.vocabularyWord.word}
        currentMeaning={currentCard?.vocabularyWord.meaning}
        currentExample={currentCard?.vocabularyWord.example}
      />
    </div>
  );
}

export default function ReviewSessionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-3">
            <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading review session...</p>
          </div>
        </div>
      }
    >
      <ReviewSessionContent />
    </Suspense>
  );
}
