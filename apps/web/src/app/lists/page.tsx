"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Folder, Plus, ArrowLeft, Upload, Trash2, ArrowRightLeft,
  ChevronDown, ChevronUp, Play, Sparkles, BookOpen, AlertCircle, Check, Volume2, Search, X, Globe
} from "lucide-react";
import { AnkiImportModal } from "@/components/anki_import_modal";
import { speakWord } from "@/lib/utils/tts";

interface VocabItem {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech?: string | null;
  cefrLevel?: string | null;
}

interface ListItem {
  id: string;
  name: string;
  description?: string | null;
  items?: { vocabularyWord: VocabItem }[];
  _count?: { items: number };
}

export default function WordListsPage() {
  const [lists, setLists] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);

  // Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  // Add Word to List Modal
  const [addWordTargetList, setAddWordTargetList] = useState<ListItem | null>(null);
  const [addWordTab, setAddWordTab] = useState<"search" | "custom">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [catalogResults, setCatalogResults] = useState<VocabItem[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [customWord, setCustomWord] = useState("");
  const [customMeaning, setCustomMeaning] = useState("");
  const [customExample, setCustomExample] = useState("");
  const [customPos, setCustomPos] = useState("noun");
  const [customCefr, setCustomCefr] = useState("B2");
  const [isSubmittingWord, setIsSubmittingWord] = useState(false);

  // Form states
  const [newListName, setNewListName] = useState("");
  const [newListDesc, setNewListDesc] = useState("");
  const [mergeSourceId, setMergeSourceId] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState("");

  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Drag and drop state
  const [draggedWordId, setDraggedWordId] = useState<string | null>(null);
  const [draggedSourceListId, setDraggedSourceListId] = useState<string | null>(null);
  const [dropTargetListId, setDropTargetListId] = useState<string | null>(null);

  const speak = (text: string) => {
    speakWord(text);
  };

  const [lookingUpOnline, setLookingUpOnline] = useState(false);

  const handleLookupOnlineForList = async () => {
    if (!searchQuery.trim()) return;
    setLookingUpOnline(true);
    try {
      const res = await fetch(`/api/dictionary/lookup?query=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.found && data.entry) {
        setCustomWord(data.entry.word);
        setCustomMeaning(data.entry.meaning);
        setCustomExample(data.entry.example || "");
        if (data.entry.partOfSpeech) setCustomPos(data.entry.partOfSpeech);
        if (data.entry.cefrLevel) setCustomCefr(data.entry.cefrLevel);
        setAddWordTab("custom");
      } else {
        setMessage({ text: data.message || "Word not found in open dictionary.", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to look up word online.", type: "error" });
    } finally {
      setLookingUpOnline(false);
    }
  };

  const handleSearchCatalog = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setCatalogResults([]);
      return;
    }
    setSearchingCatalog(true);
    try {
      const res = await fetch(`/api/words?query=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogResults(data.words || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearchingCatalog(false);
    }
  };

  const handleAddCatalogWordToList = async (vocabWordId: string) => {
    if (!addWordTargetList) return;
    setIsSubmittingWord(true);
    try {
      const res = await fetch(`/api/lists/${addWordTargetList.id}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyWordId: vocabWordId }),
      });
      if (res.ok) {
        setMessage({ text: "Word added to list successfully!", type: "success" });
        fetchLists();
        fetchListDetails(addWordTargetList.id);
        setAddWordTargetList(null);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to add word.", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to add word.", type: "error" });
    } finally {
      setIsSubmittingWord(false);
    }
  };

  const handleCreateCustomWordForList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addWordTargetList || !customWord.trim() || !customMeaning.trim()) return;
    setIsSubmittingWord(true);
    try {
      const res = await fetch(`/api/lists/${addWordTargetList.id}/words`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: customWord.trim(),
          meaning: customMeaning.trim(),
          example: customExample.trim() || undefined,
          partOfSpeech: customPos,
          cefrLevel: customCefr,
        }),
      });
      if (res.ok) {
        setMessage({ text: `"${customWord}" added to ${addWordTargetList.name}!`, type: "success" });
        fetchLists();
        fetchListDetails(addWordTargetList.id);
        setAddWordTargetList(null);
      } else {
        const data = await res.json();
        setMessage({ text: data.error || "Failed to add word.", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to add word.", type: "error" });
    } finally {
      setIsSubmittingWord(false);
    }
  };

  const fetchLists = async () => {
    try {
      const res = await fetch("/api/lists");
      if (res.ok) {
        const data = await res.json();
        setLists(data.lists || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchListDetails = async (id: string) => {
    if (expandedListId === id) {
      setExpandedListId(null);
      return;
    }

    try {
      const res = await fetch(`/api/lists/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLists((prev) =>
          prev.map((l) => (l.id === id ? { ...l, items: data.list.items } : l))
        );
        setExpandedListId(id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newListName, description: newListDesc }),
      });
      if (res.ok) {
        setNewListName("");
        setNewListDesc("");
        setIsCreateOpen(false);
        setMessage({ text: "List created successfully!", type: "success" });
        fetchLists();
      }
    } catch {
      setMessage({ text: "Failed to create list.", type: "error" });
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the list "${name}"?`)) return;

    try {
      const res = await fetch(`/api/lists/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMessage({ text: `List "${name}" deleted.`, type: "success" });
        fetchLists();
      }
    } catch {
      setMessage({ text: "Failed to delete list.", type: "error" });
    }
  };

  const handleRemoveWord = async (listId: string, wordId: string) => {
    try {
      const res = await fetch(`/api/lists/${listId}/words/${wordId}`, { method: "DELETE" });
      if (res.ok) {
        setLists((prev) =>
          prev.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items?.filter((i) => i.vocabularyWord.id !== wordId),
                  _count: { items: Math.max(0, (l._count?.items || 1) - 1) },
                }
              : l
          )
        );
      }
    } catch {
      setMessage({ text: "Failed to remove word.", type: "error" });
    }
  };

  const handleMergeLists = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) {
      setMessage({ text: "Please pick two different lists to merge.", type: "error" });
      return;
    }

    try {
      const res = await fetch("/api/lists/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceListId: mergeSourceId, targetListId: mergeTargetId }),
      });
      if (res.ok) {
        setIsMergeOpen(false);
        setMessage({ text: "Lists merged successfully!", type: "success" });
        fetchLists();
      }
    } catch {
      setMessage({ text: "Failed to merge lists.", type: "error" });
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (wordId: string, sourceListId: string) => {
    setDraggedWordId(wordId);
    setDraggedSourceListId(sourceListId);
  };

  const handleDragOver = (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    if (targetListId !== draggedSourceListId) {
      setDropTargetListId(targetListId);
    }
  };

  const handleDragLeave = () => {
    setDropTargetListId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetListId: string) => {
    e.preventDefault();
    setDropTargetListId(null);

    if (!draggedWordId || !draggedSourceListId || draggedSourceListId === targetListId) {
      return;
    }

    try {
      const res = await fetch("/api/lists/move-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wordId: draggedWordId,
          sourceListId: draggedSourceListId,
          targetListId,
        }),
      });

      if (res.ok) {
        setMessage({ text: "Word moved successfully!", type: "success" });
        fetchLists();
        if (expandedListId) {
          fetchListDetails(expandedListId);
        }
      }
    } catch {
      setMessage({ text: "Failed to move word.", type: "error" });
    } finally {
      setDraggedWordId(null);
      setDraggedSourceListId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-10">
      {/* Header bar */}
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
            <h1 className="text-3xl font-bold tracking-tight text-white">Vocabulary Lists</h1>
            <p className="text-sm text-slate-400 mt-1">
              Curate, organize, drag-and-drop words, and import Anki decks.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
            >
              <Upload className="h-4 w-4 text-indigo-400" />
              Import Anki
            </button>
            <button
              onClick={() => setIsMergeOpen(true)}
              disabled={lists.length < 2}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white disabled:opacity-40 transition-all shadow-sm"
            >
              <ArrowRightLeft className="h-4 w-4 text-violet-400" />
              Merge Lists
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New List
            </button>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {message && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs flex items-center justify-between gap-3 ${
            message.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border border-red-500/30 text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <Check className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* Word Lists Grid */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm animate-pulse">
          Loading vocabulary collections...
        </div>
      ) : lists.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {lists.map((list) => {
            const isDropTarget = dropTargetListId === list.id;
            const isExpanded = expandedListId === list.id;
            const count = list._count?.items ?? list.items?.length ?? 0;

            return (
              <div
                key={list.id}
                onDragOver={(e) => handleDragOver(e, list.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, list.id)}
                className={`glass-panel rounded-3xl p-6 flex flex-col justify-between transition-all relative overflow-hidden ${
                  isDropTarget
                    ? "border-indigo-500 ring-2 ring-indigo-500/50 bg-indigo-950/30 scale-[1.02]"
                    : "hover:border-indigo-500/30"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-white/5">
                        {count} words
                      </span>
                      <button
                        onClick={() => handleDeleteList(list.id, list.name)}
                        className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-slate-800/60 transition-colors"
                        title="Delete list"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h2 className="text-lg font-bold text-white mb-1">{list.name}</h2>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                    {list.description || "No description provided."}
                  </p>

                  {/* Expanded Words List & Drag Zone */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-white/10 space-y-2 max-h-60 overflow-y-auto pr-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Words ({list.items?.length || 0}):
                        </p>
                        <button
                          onClick={() => {
                            setAddWordTargetList(list);
                            setSearchQuery("");
                            setCatalogResults([]);
                            setCustomWord("");
                            setCustomMeaning("");
                            setCustomExample("");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          Add Word
                        </button>
                      </div>
                      {list.items && list.items.length > 0 ? (
                        list.items.map((item) => (
                          <div
                            key={item.vocabularyWord.id}
                            draggable
                            onDragStart={() => handleDragStart(item.vocabularyWord.id, list.id)}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-white/5 hover:border-indigo-500/40 text-xs text-slate-200 cursor-grab active:cursor-grabbing group transition-all"
                          >
                            <div className="flex items-start gap-2 max-w-[80%]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  speak(item.vocabularyWord.word);
                                }}
                                className="p-1 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-white transition-colors shrink-0 mt-0.5 cursor-pointer"
                                title="Listen to pronunciation"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-white">
                                    {item.vocabularyWord.word}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    ({item.vocabularyWord.partOfSpeech || "word"})
                                  </span>
                                  {item.vocabularyWord.cefrLevel && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                                      {item.vocabularyWord.cefrLevel}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.vocabularyWord.meaning}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveWord(list.id, item.vocabularyWord.id)}
                              className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from list"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-xs text-slate-500 italic mb-2">No words in this list yet.</p>
                          <button
                            onClick={() => {
                              setAddWordTargetList(list);
                              setSearchQuery("");
                              setCatalogResults([]);
                              setCustomWord("");
                              setCustomMeaning("");
                              setCustomExample("");
                            }}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-2.5 py-1 text-xs font-medium border border-indigo-500/20"
                          >
                            <Plus className="h-3 w-3" />
                            Add First Word
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => fetchListDetails(list.id)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-3.5 w-3.5" /> Hide Words
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3.5 w-3.5" /> View Words
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setAddWordTargetList(list);
                        setSearchQuery("");
                        setCatalogResults([]);
                        setCustomWord("");
                        setCustomMeaning("");
                        setCustomExample("");
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 text-xs font-medium border border-white/10 transition-all cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-indigo-400" />
                      Add Word
                    </button>

                    <Link
                      href={
                        list.name.toLowerCase().includes("hindi")
                          ? "/review?lang=hi"
                          : `/review?listId=${list.id}`
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 px-3 py-1.5 text-xs font-semibold border border-indigo-500/30 transition-all"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      Review
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-12 text-center max-w-md mx-auto">
          <BookOpen className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">No word lists yet</h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            Create your first vocabulary list or import an existing deck from Anki/CSV.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-all shadow-md"
            >
              Create List
            </button>
            <button
              onClick={() => setIsImportOpen(true)}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 text-xs font-semibold hover:text-white hover:bg-slate-800 transition-all"
            >
              Import Anki
            </button>
          </div>
        </div>
      )}

      {/* Create List Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 bg-slate-900 border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Create New Word List</h2>
            <p className="text-xs text-slate-400 mb-4">Organize vocabulary by topic, chapter, or goal.</p>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Travel Spanish, Business English"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Notes about this deck or vocabulary collection..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Lists Modal */}
      {isMergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 bg-slate-900 border-white/10 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-1">Merge Two Word Lists</h2>
            <p className="text-xs text-slate-400 mb-4">
              Combine words from a source list into a destination list.
            </p>
            <form onSubmit={handleMergeLists} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source List (will be merged and archived):</label>
                <select
                  value={mergeSourceId}
                  onChange={(e) => setMergeSourceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select source list...</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l._count?.items ?? 0} words)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Destination List (will receive all words):</label>
                <select
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Select destination list...</option>
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l._count?.items ?? 0} words)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMergeOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md"
                >
                  Merge Lists
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Anki Import Modal */}
      <AnkiImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        availableLists={lists.map((l) => ({ id: l.id, name: l.name }))}
        onImportComplete={fetchLists}
      />

      {/* Add Word to List Modal */}
      {addWordTargetList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel w-full max-w-lg rounded-3xl p-6 bg-slate-900 border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h2 className="text-lg font-bold text-white">Add Word to List</h2>
                <p className="text-xs text-indigo-400 font-medium">{addWordTargetList.name}</p>
              </div>
              <button
                onClick={() => setAddWordTargetList(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 mt-4 mb-4">
              <button
                type="button"
                onClick={() => setAddWordTab("search")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                  addWordTab === "search"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                Search Dictionary
              </button>
              <button
                type="button"
                onClick={() => setAddWordTab("custom")}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all ${
                  addWordTab === "custom"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                + Create Custom Word
              </button>
            </div>

            {addWordTab === "search" ? (
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search dictionary (e.g. ephemeral, resilient)..."
                    value={searchQuery}
                    onChange={(e) => handleSearchCatalog(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto max-h-72 space-y-2 pr-1 flex-1">
                  {searchingCatalog ? (
                    <p className="text-xs text-slate-400 text-center py-6">Searching...</p>
                  ) : catalogResults.length > 0 ? (
                    catalogResults.map((word) => (
                      <div
                        key={word.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-white/5 hover:border-indigo-500/40 transition-all text-xs"
                      >
                        <div className="max-w-[75%]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{word.word}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speak(word.word);
                              }}
                              className="text-indigo-400 hover:text-white p-0.5"
                              title="Listen to pronunciation"
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                            </button>
                            {word.partOfSpeech && (
                              <span className="text-[10px] text-slate-400">({word.partOfSpeech})</span>
                            )}
                            {word.cefrLevel && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
                                {word.cefrLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{word.meaning}</p>
                        </div>
                        <button
                          disabled={isSubmittingWord}
                          onClick={() => handleAddCatalogWordToList(word.id)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          Add
                        </button>
                      </div>
                    ))
                  ) : searchQuery.trim() ? (
                    <div className="text-center py-6 text-slate-400 text-xs space-y-3">
                      <p>No matching words found in local catalog.</p>
                      <button
                        type="button"
                        onClick={handleLookupOnlineForList}
                        disabled={lookingUpOnline}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center gap-1.5 mx-auto shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                      >
                        <Globe className="h-3.5 w-3.5" />
                        {lookingUpOnline ? "Looking up Oxford & AI..." : `Look up "${searchQuery.trim()}" in Oxford & AI`}
                      </button>
                      <button
                        onClick={() => {
                          setAddWordTab("custom");
                          setCustomWord(searchQuery.trim());
                        }}
                        className="text-indigo-400 underline block mx-auto cursor-pointer"
                      >
                        Create &quot;{searchQuery.trim()}&quot; as manual custom word
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-6">
                      Type above to search from thousands of GRE, TOEFL, IELTS & Oxford words.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateCustomWordForList} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Word</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ubiquitous"
                      value={customWord}
                      onChange={(e) => setCustomWord(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
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
                      <option value="idiom">idiom / phrase</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Definition / Meaning</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="e.g. Present, appearing, or found everywhere."
                    value={customMeaning}
                    onChange={(e) => setCustomMeaning(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Example Sentence (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Smartphones have become ubiquitous in modern daily life."
                    value={customExample}
                    onChange={(e) => setCustomExample(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">CEFR Level</label>
                  <div className="flex gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                      <button
                        type="button"
                        key={lvl}
                        onClick={() => setCustomCefr(lvl)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          customCefr === lvl
                            ? "bg-indigo-600 border-indigo-500 text-white shadow-sm"
                            : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setAddWordTargetList(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingWord}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md cursor-pointer"
                  >
                    {isSubmittingWord ? "Adding..." : "Add to List"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
