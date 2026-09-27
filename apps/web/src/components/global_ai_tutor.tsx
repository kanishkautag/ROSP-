"use client";

import { useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { AiTutorDrawer } from "./ai_tutor_drawer";

export function GlobalAiTutor() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Action Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 px-4 py-3 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="Open Lexi AI Language Tutor"
        >
          <div className="relative">
            <Bot className="h-5 w-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <span className="text-xs font-bold tracking-wide pr-1 flex items-center gap-1.5">
            Lexi AI Tutor
            <Sparkles className="h-3 w-3 text-amber-300 fill-amber-300" />
          </span>
        </button>
      </div>

      <AiTutorDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
