"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search, Filter, Plus, BookOpen, Sparkles, Check,
  FolderPlus, ArrowLeft, Volume2, Tag, Layers
} from "lucide-react";

interface WordItem {
  id: string;
  word: string;
  language: string;
  meaning: string;
  example?: string | null;
  partOfSpeech?: string | null;
  cefrLevel?: string | null;
  frequencyRank?: number | null;
  source?: string | null;
}

interface UserList {
  id: string;
  name: string;
}

export default function VocabularyCatalogPage() {
  const [words, setWords] = useState<WordItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCefr, setSelectedCefr] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Add to list modal
  const [selectedWord, setSelectedWord] = useState<WordItem | null>(null);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [targetListId, setTargetListId] = useState("");
  const [addingToList, setAddingToList] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create custom word modal
  const [isCreateCustomOpen, setIsCreateCustomOpen] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [customMeaning, setCustomMeaning] = useState("");
  const [customExample, setCustomExample] = useState("");
  const [customPos, setCustomPos] = useState("noun");
  const [customCefr, setCustomCefr] = useState("B1");

  const cefrLevels = ["ALL", "A1", "A2", "B1", "B2", "C1", "C2"];

  const speak = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const fetchWords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append("query", query.trim());
      if (selectedCefr !== "ALL") params.append("cefrLevel", selectedCefr);

      const res = await fetch(`/api/words?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setWords(data.words || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setUserLists(data.lists || []);
        if (data.lists?.length > 0) {
          setTargetListId(data.lists[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCefr]);

  useEffect(() => {
    fetchUserLists();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWords();
  };

  const handleAddWordToList = async () => {
    if (!selectedWord || !targetListId) return;
    setAddingToList(true);
    try {
      const res = await fetch("/api/anki/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetListId,
          cards: [
            {
              word: selectedWord.word,
              meaning: selectedWord.meaning,
              example: selectedWord.example,
              partOfSpeech: selectedWord.partOfSpeech,
              cefrLevel: selectedWord.cefrLevel as any,
            },
          ],
        }),
      });

      if (res.ok) {
        setSuccessMsg(`"${selectedWord.word}" added to your study list!`);
        setTimeout(() => {
          setSelectedWord(null);
          setSuccessMsg(null);
        }, 1200);
      }
    } catch {
      alert("Failed to add word to list.");
    } finally {
      setAddingToList(false);
    }
  };

  const handleCreateCustomWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWord.trim() || !customMeaning.trim()) return;

    try {
      const res = await fetch("/api/words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: customWord.trim().toLowerCase(),
          language: "en",
          meaning: customMeaning.trim(),
          example: customExample.trim() || undefined,
          partOfSpeech: customPos,
          cefrLevel: customCefr as any,
          source: "Custom User Entry",
        }),
      });

      if (res.ok) {
        setIsCreateCustomOpen(false);
        setCustomWord("");
        setCustomMeaning("");
        setCustomExample("");
        fetchWords();
      }
    } catch {
      alert("Failed to create vocabulary word.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Vocabulary Vault</h1>
            <p className="text-sm text-slate-400 mt-1">
              Search canonical vocabulary, filter by CEFR levels, and save items to study lists.
            </p>
          </div>
          <button
            onClick={() => setIsCreateCustomOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Custom Word
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="glass-panel rounded-2xl p-4 mb-8 bg-slate-900/80 space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search words or definitions (e.g. apple, language, achieve)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 pl-10 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold border border-indigo-500/30 transition-all"
          >
            Search
          </button>
        </form>

        {/* CEFR Level Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            CEFR Level:
          </span>
          {cefrLevels.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedCefr(lvl)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                selectedCefr === lvl
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Words Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
          Searching vocabulary dictionary...
        </div>
      ) : words.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {words.map((item) => (
            <div
              key={item.id}
              className="glass-panel rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/30 transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    {item.partOfSpeech || "word"}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.cefrLevel && (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] font-bold border border-indigo-500/20">
                        {item.cefrLevel}
                      </span>
                    )}
                    {item.frequencyRank && (
                      <span className="text-[10px] text-slate-500">
                        #{item.frequencyRank}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-2xl font-extrabold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
                    {item.word}
                  </h3>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(item.word);
                    }}
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 text-indigo-400 hover:text-white transition-all cursor-pointer shadow-sm"
                    title="Pronounce word"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 mb-4 line-clamp-3 leading-relaxed">
                  {item.meaning}
                </p>

                {item.example && (
                  <p className="text-xs text-slate-400 italic mb-4 border-l-2 border-indigo-500/30 pl-3">
                    &quot;{item.example}&quot;
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[120px]">
                  {item.source || "Oxford 3000 / NGSL"}
                </span>

                <button
                  onClick={() => setSelectedWord(item)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 text-slate-200 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-indigo-400" />
                  Add to List
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
          <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">No vocabulary matched</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Try adjusting your search query or selecting a different CEFR proficiency filter.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setSelectedCefr("ALL");
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Add to List Dialog */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-sm rounded-3xl p-6 bg-slate-900 border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Add &quot;{selectedWord.word}&quot;
            </h3>
            <p className="text-xs text-slate-400 mb-4">Choose which study collection to save this word to.</p>

            {successMsg ? (
              <div className="py-6 text-center text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                {successMsg}
              </div>
            ) : userLists.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target List</label>
                  <select
                    value={targetListId}
                    onChange={(e) => setTargetListId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {userLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWord(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddWordToList}
                    disabled={addingToList}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                  >
                    {addingToList ? "Saving..." : "Confirm & Save"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400">
                You don&apos;t have any word lists yet.{" "}
                <Link href="/lists" className="text-indigo-400 underline">
                  Create a list first
                </Link>
                .
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Word Modal */}
      {isCreateCustomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 bg-slate-900 border-white/10 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add Custom Vocabulary Word</h3>
            <p className="text-xs text-slate-400 mb-4">Add your own term and example to the personal dictionary.</p>
            <form onSubmit={handleCreateCustomWord} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Word</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. serendipity"
                  value={customWord}
                  onChange={(e) => setCustomWord(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Part of Speech</label>
                  <select
                    value={customPos}
                    onChange={(e) => setCustomPos(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="noun">noun</option>
                    <option value="verb">verb</option>
                    <option value="adjective">adjective</option>
                    <option value="adverb">adverb</option>
                    <option value="phrase">phrase</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">CEFR Level</label>
                  <select
                    value={customCefr}
                    onChange={(e) => setCustomCefr(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="A1">A1</option>
                    <option value="A2">A2</option>
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="C1">C1</option>
                    <option value="C2">C2</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Definition / Meaning</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Clear definition of the word..."
                  value={customMeaning}
                  onChange={(e) => setCustomMeaning(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Example Sentence (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Contextual sentence using the word..."
                  value={customExample}
                  onChange={(e) => setCustomExample(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateCustomOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
