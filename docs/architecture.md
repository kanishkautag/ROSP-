# ROSP Architecture & System Design

**ROSP (AI Assisted Language Learning App with Spaced Repetition)** is an academic mini-project balancing clean software engineering patterns, modular extensibility, and minimal operational overhead.

---

## 1. High-Level Monorepo Structure

The project is structured as a lightweight `pnpm` monorepo:

```
ROSP/
├── apps/
│   └── web/                   # Next.js 14 App Router (Fullstack: Frontend + API Route Handlers)
│       ├── src/
│       │   ├── app/           # App router pages (/dashboard, /lists, /vocabulary, /review, /onboarding, /login)
│       │   │   └── api/       # HTTP route handlers (/api/lists, /api/words, /api/reviews, /api/anki, /api/onboarding)
│       │   ├── components/    # Interactive UI components (AnkiModal, DragDrop, DashboardClient, Navbar)
│       │   └── lib/
│       │       ├── anki/      # .apkg (JSZip + SQLite) and CSV/TSV parser
│       │       ├── auth/      # Supabase SSR & NextAuth session management
│       │       ├── learning/  # SM2 & FSRS algorithmic implementations + factory
│       │       ├── llm/       # Ollama, Groq, and deterministic fallback generator
│       │       ├── services/  # Domain services (review, vocabulary, word list, user stats)
│       │       └── supabase/  # Supabase SSR client, server, and middleware helpers
├── packages/
│   ├── db/                    # Centralized Prisma schema, migrations, and database client
│   └── shared/                # Zod schemas, contract DTOs, and shared type definitions
├── supabase/
│   ├── migrations/            # Production Supabase PostgreSQL migrations with Row Level Security (RLS)
│   └── seed.sql               # Seed dataset for Supabase PostgreSQL
├── scripts/
│   └── vocabulary/            # Ingestion pipeline mapping Oxford 3000/5000 CEFR lemmas, NGSL, and WordNet
├── docs/                      # Architectural and database specifications
└── pnpm-workspace.yaml        # Monorepo workspace configuration
```

---

## 2. Fullstack Next.js (App Router)

To eliminate separate backend deployments, ROSP hosts both frontend presentation and backend API endpoints within Next.js:
- **Client & Server Pages**: Built with React Server Components (RSC) and Client Components with Tailwind CSS for high-performance, responsive interfaces.
- **Route Handlers (`src/app/api/`)**: Handle HTTP serialization, Zod validation, and error reporting, delegating business logic to `src/lib/services/`.
- **Architectural Flow**:
  $$\text{Client / Browser} \longrightarrow \text{Route Handler} \longrightarrow \text{Domain Service} \longrightarrow \text{Database (Prisma / Supabase)} \longrightarrow \text{Response DTO}$$

---

## 3. Spaced Repetition Algorithms (SM2 & FSRS)

The review engine decouples scheduling mathematics through the `LearningAlgorithm` abstract contract:

```
LearningAlgorithm
├── SM2Algorithm    (SuperMemo 2: repetitions, interval, easeFactor)
└── FSRSAlgorithm   (Free Spaced Repetition: difficulty D, stability S, retrievability R)
```

- **Contracts**:
  - `initialize()`: Returns algorithm-specific initial learning parameters for new cards.
  - `schedule(currentState, review)`: Calculates next review intervals based on a 4-point rating system:
    - **1: Again** (Complete blackout, reset interval)
    - **2: Hard** (Recalled with intense effort, fractional interval growth)
    - **3: Good** (Correct recall with reasonable hesitation, standard interval progression)
    - **4: Easy** (Instant, effortless recall, boosted interval bonus)
- **Factory Pattern (`LearningAlgorithmFactory`)**: Dynamically instantiates the learner's chosen algorithm based on their profile preference.

---

## 4. AI Exercise Engine with Guaranteed Deterministic Fallback

AI exercise generation supports Fill in the Blank, Multiple Choice, and Sentence Construction:

```
LLMProvider
├── OllamaProvider (Local inference, default: http://localhost:11434)
├── GroqProvider   (Cloud inference via Groq API)
└── FallbackEngine (Guaranteed deterministic generator, zero external dependencies)
```

- **Zero-Failure Architecture**: Network timeouts or offline LLM daemons automatically route to `fallback_generator.ts`. Review sessions never crash or stall waiting for an external model.
- **Provider Configuration**: Model provider selection is an infrastructure decision configured via environment variables (`LLM_PROVIDER`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`).

---

## 5. Anki & Vocabulary Import Subsystem

The import pipeline supports `.apkg` packages, `.csv`, and `.tsv` files:
1. **Extraction**: Unzips `.apkg` packages in memory using `jszip` and inspects `collection.anki2` / `collection.anki21` note tables.
2. **Text Normalization**: Strips HTML tags, parses field delimiters (`\x1f`, commas, or tabs), and maps front/back fields to word, definition, and example sentences.
3. **Interactive Preview**: Presents parsed cards in a pre-import verification modal before database persistence.

---

## 6. Real-Data Gamified Dashboard

The dashboard computes live user progress metrics:
- **Daily Review Goal**: Circular SVG progress ring tracking completed reviews vs daily target.
- **Streak Tracker**: Consecutive day counter derived from timestamped review attempt logs.
- **XP & Level System**: Dynamic experience points ($15\text{ XP}$ per review $+ 30\text{ XP}$ streak bonus) with leveling tiers.
- **Retention Rate**: Mathematical ratio of successful reviews ($\text{Rating} \ge 3$) over total attempts.
- **Weak Words**: Automatically flags cards with low ease factors or recent failures for rapid reinforcement.
- **Recommended Lexicon**: Suggests canonical CEFR vocabulary not yet in the user's collection with 1-click enrollment.
