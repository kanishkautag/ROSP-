"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain, Sparkles, CheckCircle2, XCircle, ArrowLeft,
  RotateCcw, Award, Zap, HelpCircle, ArrowRight, Check
} from "lucide-react";

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

  // Exercise state
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [exerciseLoading, setExerciseLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

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
        }
      } catch (err) {
        console.error("Exercise generation error:", err);
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
          userAnswer: selectedOption || textAnswer || selectedTokens.join(" "),
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
            Outstanding dedication! Your memory intervals have been recalibrated.
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
              href="/lists"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all"
            >
              Explore Word Lists
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-10 flex-1 flex flex-col justify-center">
      {/* Top progress bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-400">
            {currentIndex + 1} / {reviews.length}
          </span>
          <div className="w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / reviews.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Flashcard & Exercise Container */}
      <div className="glass-panel rounded-3xl p-6 sm:p-10 border-white/10 shadow-2xl relative">
        {/* Algorithm Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20 uppercase tracking-wider">
            {currentCard?.learningState?.algorithm || "SM2"}
          </span>
          {currentCard?.vocabularyWord.cefrLevel && (
            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-bold">
              CEFR {currentCard.vocabularyWord.cefrLevel}
            </span>
          )}
        </div>

        {/* Word Display */}
        <div className="text-center mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            {currentCard?.vocabularyWord.partOfSpeech || "vocabulary word"}
          </span>
          <h2 className="text-4xl sm:text-5xl font-black text-white mt-1 mb-2 tracking-tight">
            {currentCard?.vocabularyWord.word}
          </h2>
          <p className="text-xs text-slate-400">{currentCard?.vocabularyWord.meaning}</p>
        </div>

        {/* Exercise Section */}
        <div className="border-t border-white/10 pt-6">
          {exerciseLoading ? (
            <div className="text-center py-8 text-xs text-indigo-300 animate-pulse flex items-center justify-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              Generating interactive AI exercise...
            </div>
          ) : exercise ? (
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
                          : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Type: Fill in the Blank */}
              {exercise.type === "FILL_BLANK" && (
                <div>
                  <input
                    type="text"
                    disabled={isAnswerChecked}
                    placeholder="Type the missing vocabulary word..."
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              {/* Type: Sentence Construction */}
              {exercise.type === "SENTENCE_CONSTRUCTION" && exercise.options && (
                <div className="space-y-3">
                  {/* Selected word tray */}
                  <div className="min-h-12 p-3 rounded-xl border border-slate-700 bg-slate-950/80 flex flex-wrap gap-1.5 items-center">
                    {selectedTokens.length > 0 ? (
                      selectedTokens.map((token, i) => (
                        <button
                          key={i}
                          type="button"
                          disabled={isAnswerChecked}
                          onClick={() =>
                            setSelectedTokens((prev) => prev.filter((_, idx) => idx !== i))
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
                        >
                          {token}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500 italic">Click words below in order...</span>
                    )}
                  </div>

                  {/* Word chips */}
                  <div className="flex flex-wrap gap-2">
                    {exercise.options.map((token, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled={isAnswerChecked}
                        onClick={() => setSelectedTokens((prev) => [...prev, token])}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all"
                      >
                        {token}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Check Answer Button */}
              {!isAnswerChecked && (
                <button
                  type="button"
                  onClick={handleCheckAnswer}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  Check Answer
                </button>
              )}

              {/* Feedback Banner */}
              {isAnswerChecked && (
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in duration-200 ${
                    isCorrect
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                      : "border-red-500/40 bg-red-500/10 text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        Correct! Excellent recall.
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-400" />
                        Incorrect. Target answer: &quot;{exercise.answer}&quot;
                      </>
                    )}
                  </div>
                  {exercise.explanation && (
                    <p className="text-[11px] opacity-90">{exercise.explanation}</p>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Spaced Repetition Rating Buttons */}
        {isAnswerChecked && (
          <div className="mt-8 pt-6 border-t border-white/10 space-y-3 animate-in fade-in duration-200">
            <p className="text-center text-xs font-semibold text-slate-400">
              Rate your memory recall difficulty:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => handleRateCard(1)}
                className="p-3 rounded-2xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-bold">Again</div>
                <div className="text-[10px] opacity-80 mt-0.5">1 day</div>
              </button>

              <button
                type="button"
                onClick={() => handleRateCard(2)}
                className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-bold">Hard</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {Math.round((currentCard?.learningState?.interval ?? 1) * 1.2)}d
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRateCard(3)}
                className="p-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-bold">Good</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {Math.round(
                    (currentCard?.learningState?.interval ?? 1) *
                      (currentCard?.learningState?.easeFactor ?? 2.5)
                  )}
                  d
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRateCard(4)}
                className="p-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-center transition-all cursor-pointer"
              >
                <div className="text-xs font-bold">Easy</div>
                <div className="text-[10px] opacity-80 mt-0.5">
                  {Math.round(
                    (currentCard?.learningState?.interval ?? 1) *
                      (currentCard?.learningState?.easeFactor ?? 2.5) *
                      1.3
                  )}
                  d
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
