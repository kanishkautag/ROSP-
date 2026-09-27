"use client";

import { useState } from "react";
import { Upload, X, Check, FileText, AlertCircle, Sparkles, FolderPlus } from "lucide-react";
import { parseDelimitedText, parseAnkiPackage } from "@/lib/anki/parser";
import { AnkiCard } from "@rosp/shared";

interface WordListOption {
  id: string;
  name: string;
}

interface AnkiImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableLists: WordListOption[];
  onImportComplete?: () => void;
}

export function AnkiImportModal({
  isOpen,
  onClose,
  availableLists,
  onImportComplete,
}: AnkiImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedCards, setParsedCards] = useState<AnkiCard[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Target list selection
  const [selectedListId, setSelectedListId] = useState<string>(
    availableLists[0]?.id || "new"
  );
  const [newListName, setNewListName] = useState("");

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setSuccess(null);
    setParsing(true);

    try {
      let cards: AnkiCard[] = [];

      if (selected.name.endsWith(".apkg")) {
        const buffer = await selected.arrayBuffer();
        cards = await parseAnkiPackage(buffer);
      } else {
        const text = await selected.text();
        cards = parseDelimitedText(text);
      }

      if (cards.length === 0) {
        throw new Error("No flashcards found. Please verify the file format.");
      }

      setParsedCards(cards);
      if (!newListName) {
        setNewListName(selected.name.replace(/\.[^/.]+$/, ""));
      }
    } catch (err: any) {
      setError(err?.message || "Failed to parse file.");
      setParsedCards([]);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedCards.length === 0) return;

    setImporting(true);
    setError(null);

    try {
      const payload = {
        targetListId: selectedListId === "new" ? undefined : selectedListId,
        newListName: selectedListId === "new" ? newListName || "Imported List" : undefined,
        cards: parsedCards,
      };

      const res = await fetch("/api/anki/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      setSuccess(`Successfully imported ${data.importedCount} words!`);
      setTimeout(() => {
        onImportComplete?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setError(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 sm:p-8 bg-slate-900/95 border-white/10 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Import Anki / Flashcards</h2>
              <p className="text-xs text-slate-400">Supports .apkg, CSV, and TSV formats</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5">
          {/* File input dropzone */}
          <div className="rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 p-6 text-center transition-colors bg-slate-950/40">
            <Upload className="h-8 w-8 text-indigo-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-200">
              {file ? file.name : "Select or drag .apkg, .csv, or .tsv file"}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Anki exports with Front/Back or Word/Meaning columns
            </p>
            <input
              type="file"
              accept=".apkg,.csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="anki-file-input"
            />
            <label
              htmlFor="anki-file-input"
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 text-xs font-semibold cursor-pointer border border-indigo-500/30 transition-all"
            >
              Browse File
            </label>
          </div>

          {parsing && (
            <div className="text-center py-4 text-xs text-indigo-300 animate-pulse">
              Parsing cards and extracting vocabulary...
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300 flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {/* Cards Preview */}
          {parsedCards.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  Preview ({parsedCards.length} cards detected)
                </span>
              </div>

              {/* Target List Destination */}
              <div className="glass-panel rounded-2xl p-4 space-y-3 bg-slate-950/60">
                <label className="block text-xs font-medium text-slate-300">
                  Target Word List:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="new">+ Create New List</option>
                    {availableLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>

                  {selectedListId === "new" && (
                    <input
                      type="text"
                      placeholder="New List Name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                  )}
                </div>
              </div>

              {/* Table preview */}
              <div className="border border-white/10 rounded-2xl overflow-hidden max-h-52 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] sticky top-0 backdrop-blur-sm">
                    <tr>
                      <th className="py-2.5 px-3">Word</th>
                      <th className="py-2.5 px-3">Meaning</th>
                      <th className="py-2.5 px-3">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {parsedCards.slice(0, 15).map((card, idx) => (
                      <tr key={idx} className="hover:bg-white/5">
                        <td className="py-2 px-3 font-semibold text-white">{card.word}</td>
                        <td className="py-2 px-3 text-slate-300">{card.meaning}</td>
                        <td className="py-2 px-3 text-slate-400 italic line-clamp-1">
                          {card.example || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedCards.length > 15 && (
                <p className="text-[11px] text-slate-500 text-center">
                  Showing first 15 of {parsedCards.length} cards
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={parsedCards.length === 0 || importing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {importing ? "Importing..." : `Import ${parsedCards.length} Cards`}
          </button>
        </div>
      </div>
    </div>
  );
}
