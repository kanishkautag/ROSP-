import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROSP - AI Assisted Language Learning App with Spaced Repetition",
  description:
    "Learn vocabulary. Practice with AI. Review at the right time using SM2 or FSRS algorithms and Ollama/Groq generated exercises.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <Navbar />
        <main className="flex-1 flex flex-col">{children}</main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <p>© 2026 ROSP - AI Assisted Language Learning App with Spaced Repetition</p>
        </footer>
      </body>
    </html>
  );
}
