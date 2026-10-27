import Link from "next/link";
import { Brain, Sparkles, Settings2, User as UserIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { SignOutButton } from "./sign_out_button";

export async function Navbar() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
            LinguaPulse <span className="text-[11px] font-semibold text-indigo-400 border border-indigo-500/30 rounded-full px-2 py-0.5 ml-1">AI Assistant</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <Link href="/vocabulary" className="hover:text-white transition-colors">
            Vocabulary
          </Link>
          <Link href="/lists" className="hover:text-white transition-colors">
            Lists
          </Link>
          <Link href="/review" className="hover:text-white transition-colors flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300">
            <Sparkles className="h-4 w-4" />
            Review
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-300 bg-slate-900/60 border border-white/10 px-3 py-1.5 rounded-lg hover:border-indigo-500/40 transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold">
                  {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </div>
                <span>{user.name || user.email.split("@")[0]}</span>
              </Link>
              <Link
                id="nav-preferences"
                href="/onboarding"
                title="Learning preferences"
                className="flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-900/60 border border-white/10 px-2.5 py-1.5 rounded-lg hover:border-indigo-500/40 hover:text-white transition-colors"
              >
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Preferences</span>
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-1.5 text-sm font-medium text-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
              >
                <UserIcon className="h-4 w-4 text-slate-400" />
                Sign In
              </Link>
              <Link
                href="/login"
                className="hidden sm:inline-flex rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
