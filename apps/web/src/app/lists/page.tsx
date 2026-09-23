import Link from "next/link";
import { BookOpen, Plus, Folder, ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { getUserWordLists } from "@/lib/services/word_list_service";

export const dynamic = "force-dynamic";

export default async function WordListsPage() {
  const user = await getCurrentUser();
  const lists = user ? await getUserWordLists(user.id).catch(() => []) : [];

  return (
    <div className="mx-auto max-w-6xl w-full px-4 sm:px-6 py-10">
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
            <h1 className="text-3xl font-bold tracking-tight text-white">Word Lists</h1>
            <p className="text-sm text-slate-400 mt-1">
              Curate, organize, and manage your vocabulary sets.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer opacity-90 hover:opacity-100"
          >
            <Plus className="h-4 w-4" />
            New Word List
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {lists.length > 0 ? (
          lists.map((list) => (
            <div
              key={list.id}
              className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Folder className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {list._count.items} words
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-white">{list.name}</h2>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                  {list.description || "No description provided."}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                <span>Updated recently</span>
                <Link
                  href="/review"
                  className="font-medium text-indigo-400 hover:text-indigo-300"
                >
                  Practice List →
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="glass-panel rounded-2xl p-8 col-span-full text-center py-12">
            <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-white">No word lists yet</h2>
            <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Run database seed to populate default collections like English Basics, or create your first custom list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
