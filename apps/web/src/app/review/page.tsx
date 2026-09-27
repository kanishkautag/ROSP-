"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, Sparkles, CheckCircle2, XCircle, ArrowLeft,
  Volume2, RotateCcw, Award, Zap, HelpCircle, ArrowRight,
  Check, Eye, EyeOff, Bot, MessageSquare, SkipForward
} from "lucide-react";
import { AiTutorDrawer } from "@/components/ai_tutor_drawer";
import { speakWord } from "@/lib/utils/tts";

interface VocabularyWord {
  id: string;
  word: string;
  language: string;
  meaning: string;
  example?: string | null;
  partOfSpeech?: string | null;
  cefrLevel?: string | null;
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

export default function ReviewSessionPage() {
  const [reviews, setReviews] = useState<DueReview[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Exercise & Flashcard state
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showMeaningAndExample, setShowMeaningAndExample] = useState(true);
  const [directRatingMode, setDirectRatingMode] = useState(false);

  // AI Tutor Drawer
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);

  // Session summary stats
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  const fetchDueReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews?limit=20");
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Failed to fetch due reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueReviews();
  }, []);

  const currentCard = reviews[currentIndex];

  // Fetch or generate exercise whenever current card changes
  useEffect(() => {
    if (!currentCard) return;

    const loadExercise = async () => {
      setExerciseLoading(true);
      setIsAnswerChecked(false);
      setSelectedOption("");
      setTextAnswer("");
      setSelectedTokens([]);
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
          setExercise(data.exercise);
        } else {
          // If exercise generation errors, switch to direct flashcard recall mode
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
      userAnswer = selectedTokens.join(" ");
    } else {
      userAnswer = textAnswer.trim();
    }

    const normalizedUser = userAnswer.toLowerCase().trim();
    const normalizedCorrect = exercise.answer.toLowerCase().trim();

    const correct =
      normalizedUser === normalizedCorrect ||
      normalizedCorrect.includes(normalizedUser);

    setIsCorrect(correct);
    setIsAnswerChecked(true);

    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }
  };

  const handleRateCard = async (rating: number) => {
    if (!currentCard) return;

    try {
      await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWordId: currentCard.id,
          rating,
          exerciseId: exercise?.id,
          userAnswer: selectedOption || textAnswer || selectedTokens.join(" ") || "manual-recall",
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

  // Session Completion View
  if (sessionCompleted || (!loading && reviews.length === 0)) {
    const accuracy = reviewedCount > 0 ? Math.round((correctCount / reviewedCount) * 100) : 100;
    const xpGained = reviewedCount * 15;

    return (
      <div className="mx-auto max-w-xl w-full px-4 py-16 flex-1 flex flex-col justify-center text-center">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border-white/10 shadow-2xl relative overflow-hidden">
          <div className="h-16 w-16 rounded-3xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-5 border border-indigo-500/30">
            <Award className="h-8 w-8 text-indigo-300" />
          </div>

          <h2 className="text-3xl font-black text-white mb-2">Review Complete!</h2>
          <p className="text-sm text-slate-400 mb-8">
            Outstanding dedication! Your memory intervals have been recalibrated using spaced repetition.
          </p>

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

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
            >
              Back to Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/vocabulary"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              Explore Vocabulary
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

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
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
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 hover:bg-indigo-500/30 transition-all"
          >
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
            Ask AI Tutor
          </button>

          <button
            onClick={handleSkipCard}
            title="Skip to next card"
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
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
            {currentCard?.vocabularyWord.cefrLevel && (
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
                CEFR {currentCard.vocabularyWord.cefrLevel}
              </span>
            )}
          </div>

          <button
            onClick={() => setDirectRatingMode(!directRatingMode)}
            className="text-[11px] text-slate-400 hover:text-indigo-300 underline transition-colors"
          >
            {directRatingMode ? "Switch to AI Exercise" : "Flashcard Self-Rating"}
          </button>
        </div>

        {/* Word Display with Text-To-Speech Pronunciation */}
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            {currentCard?.vocabularyWord.partOfSpeech || "vocabulary word"}
          </span>

          <div className="flex items-center justify-center gap-3 mt-1 mb-2">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
              {currentCard?.vocabularyWord.word}
            </h2>
            <button
              onClick={() => speakWord(currentCard?.vocabularyWord.word || "", currentCard?.vocabularyWord.language)}
              title={`Listen to pronunciation (${currentCard?.vocabularyWord.language === "hi" ? "Hindi" : "English"})`}
              className="h-10 w-10 rounded-2xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-indigo-500/30 active:scale-95"
            >
              <Volume2 className="h-5 w-5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            {currentCard?.vocabularyWord.meaning}
          </p>

          {/* Contextual Sentence Box */}
          {currentCard?.vocabularyWord.example && (
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-950/70 border border-white/5 text-left max-w-lg mx-auto">
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 block mb-0.5">
                Contextual Example
              </span>
              <p className="text-xs text-slate-200 italic leading-relaxed">
                &ldquo;{currentCard.vocabularyWord.example}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Dynamic Exercise / Flashcard Section */}
        <div className="border-t border-white/10 pt-6">
          {exerciseLoading ? (
            <div className="text-center py-8 text-xs text-indigo-300 animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Generating Groq AI exercise...
            </div>
          ) : exercise && !directRatingMode ? (
            <div className="space-y-4">
              <div className="text-xs font-semibold text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-2xl border border-white/5 whitespace-pre-wrap">
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
                      className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
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
                          className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
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
                <div className="space-y-3">
                  <div className="min-h-[46px] p-3 rounded-xl border border-dashed border-slate-700 bg-slate-950 flex flex-wrap gap-1.5 items-center">
                    {selectedTokens.length > 0 ? (
                      selectedTokens.map((token, i) => (
                        <span
                          key={i}
                          onClick={() => {
                            if (!isAnswerChecked) {
                              setSelectedTokens((prev) => prev.filter((_, idx) => idx !== i));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 text-xs font-medium cursor-pointer hover:bg-red-500/20 hover:text-red-200 transition-colors"
                        >
                          {token}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">
                        Click words below in sequence to assemble the sentence
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {exercise.options.map((tok, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={isAnswerChecked}
                        onClick={() => setSelectedTokens((prev) => [...prev, tok])}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:border-slate-700 active:scale-95 transition-all"
                      >
                        {tok}
                      </button>
                    ))}
                    {selectedTokens.length > 0 && !isAnswerChecked && (
                      <button
                        type="button"
                        onClick={() => setSelectedTokens([])}
                        className="px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Check Answer Button */}
              {!isAnswerChecked && (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  disabled={
                    (exercise.type === "MULTIPLE_CHOICE" && !selectedOption) ||
                    (exercise.type === "FILL_BLANK" && !textAnswer.trim()) ||
                    (exercise.type === "SENTENCE_CONSTRUCTION" && selectedTokens.length === 0)
                  }
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  Verify Answer
                </button>
              )}

              {/* Feedback and Explanation */}
              {isAnswerChecked && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                    isCorrect
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                      : "border-red-500/30 bg-red-500/10 text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Correct! Excellent recall.
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-400" />
                        Incorrect. Target answer: &quot;{exercise.answer}&quot;
                      </>
                    )}
                  </div>
                  {exercise.explanation && (
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {exercise.explanation}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Flashcard Self-Rating Mode */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 text-center">
                <span className="text-xs text-slate-400">
                  How well did you remember this word before checking? Rate your recall below to schedule the next interval.
                </span>
              </div>
            </div>
          )}

          {/* 4 Recall Rating Buttons (SM2 / FSRS) */}
          {(isAnswerChecked || directRatingMode || !exercise) && (
            <div className="pt-6 border-t border-white/10 mt-6 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
                <span>Select Recall Ease:</span>
                <span>Adaptive Spaced Interval</span>
              </div>

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
                    Repeat ({againDays}d)
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
