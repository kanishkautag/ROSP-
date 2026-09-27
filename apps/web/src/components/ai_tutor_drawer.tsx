"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Sparkles, HelpCircle, BookOpen, Lightbulb } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AiTutorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentWord?: string;
  currentMeaning?: string;
  currentExample?: string | null;
}

export function AiTutorDrawer({
  isOpen,
  onClose,
  currentWord,
  currentMeaning,
  currentExample,
}: AiTutorDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: currentWord
        ? `Hi! I'm Lexi, your AI vocabulary tutor powered by Groq. I'm ready to help you explore **"${currentWord}"**! You can ask me for a memory mnemonic, conversational examples, or test yourself.`
        : "Hi! I'm Lexi, your language coach powered by Groq. Ask me anything about grammar, vocabulary nuances, or memory strategies!",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Update initial message if currentWord changes
  useEffect(() => {
    if (currentWord) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `We're now focusing on **"${currentWord}"** (${currentMeaning || ""}). How would you like to explore it?`,
        },
      ]);
    }
  }, [currentWord]);

  if (!isOpen) return null;

  const sendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          currentWord,
          currentMeaning,
          currentExample,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I had trouble generating a reply. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Network error communicating with AI tutor." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const quickPrompts = [
    `Give me a memorable mnemonic for "${currentWord || "this word"}"`,
    `Use "${currentWord || "this word"}" in a casual modern dialogue`,
    `Quiz me with a fill-in-the-blank on this word`,
    `What are the most common collocations with "${currentWord || "this word"}"?`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md h-full bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white">Lexi AI Tutor</h3>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  Groq Qwen 27B
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Contextual language companion</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Current Word Focus Pill */}
        {currentWord && (
          <div className="px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Target:</span>
              <span className="font-bold text-white">{currentWord}</span>
            </div>
            <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
              {currentMeaning}
            </span>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-800/90 text-slate-200 border border-white/10 shadow-md"
                }`}
              >
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content}</div>
                ) : (
                  <div className="space-y-1">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-sm font-bold text-white mt-2 mb-1.5 flex items-center gap-1.5 border-b border-white/10 pb-1">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xs font-bold text-indigo-300 mt-2.5 mb-1 flex items-center gap-1">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-xs font-bold text-indigo-200 mt-2 mb-1 flex items-center gap-1">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0 leading-relaxed text-slate-200">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="my-1.5 space-y-1 pl-4 list-disc marker:text-indigo-400">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="my-1.5 space-y-1 pl-4 list-decimal marker:text-indigo-400">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="leading-relaxed text-slate-200">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-white">{children}</strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-indigo-300">{children}</em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-indigo-500 bg-indigo-950/40 px-3 py-1.5 my-2 rounded-r-xl text-indigo-200 italic">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="border-white/10 my-2.5" />,
                        code: ({ children }) => (
                          <code className="px-1.5 py-0.5 rounded bg-slate-950 border border-white/10 text-indigo-300 font-mono text-[11px]">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 animate-pulse py-2">
              <Bot className="h-4 w-4" />
              Lexi is thinking...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 border-t border-white/5 bg-slate-950/50 space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block px-1">
            Quick Prompts
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.slice(0, 2).map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                disabled={loading}
                className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-indigo-600/30 border border-slate-700 hover:border-indigo-500/40 transition-all text-left truncate max-w-full"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-slate-950 flex gap-2">
          <input
            type="text"
            placeholder="Ask Lexi anything about this word..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-all shadow-md flex items-center justify-center cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
