# ROSP: AI Assisted Language Learning App with Spaced Repetition

**ROSP** is an academic mini-project designed to help language learners acquire vocabulary efficiently using modern spaced repetition algorithms (**SuperMemo SM2** and **FSRS**), contextual AI exercise generation (**Ollama** and **Groq**), and interactive vocabulary management with Anki import support.

---

## ✨ Features

- **Authentication & Onboarding**:
  - Supabase SSR authentication (Email signup/login, Google OAuth ready).
  - 5-step onboarding wizard configuring native language, target language, CEFR level (A1–C2), daily review goals, and algorithm preference (SM2 vs FSRS).
  - Automatically provisions a personalized starter deck matching the learner's proficiency.

- **Vocabulary Management & Drag-and-Drop**:
  - Word Lists with HTML5 drag-and-drop to move words between collections.
  - Word list merging (combines multiple lists into one).
  - Searchable Vocabulary Vault with real-time query filtering and CEFR level chips.
  - Custom word entry creator for personal terms and definitions.

- **Anki Deck & File Import**:
  - Full support for Anki `.apkg` packages (unzipped in-memory with JSZip), `.csv`, and `.tsv` files.
  - Interactive pre-import verification modal displaying parsed cards before database persistence.

- **Spaced Repetition Engine (SM2 & FSRS)**:
  - Exact mathematical implementation of **SuperMemo SM2** (repetitions, intervals, ease factors).
  - Exact mathematical implementation of **FSRS** (retrievability decay, stability, difficulty).
  - 4-point recall rating interface: **Again**, **Hard**, **Good**, and **Easy** with live predicted interval previews.

- **AI Exercise Generation with Zero-Failure Fallback**:
  - Contextual exercises: Fill in the Blank, Multiple Choice, and Sentence Construction.
  - Pluggable provider architecture supporting local Ollama (`http://localhost:11434`) and cloud Groq.
  - Built-in deterministic fallback generator ensuring review sessions never crash or freeze during network timeouts.

- **Real-Data Gamified Dashboard**:
  - Circular SVG progress ring tracking reviews completed today against daily goals.
  - Streak counter derived from historical timestamped review logs.
  - Experience points (XP) and leveling system.
  - Overall memory retention rate calculation ($\ge 3$ ratings).
  - Weak words section flagging low-interval or difficult cards for immediate reinforcement.
  - Recommended words section with 1-click "Add to Study List" enrollment.

- **Ingestion Pipeline**:
  - Script pipeline (`scripts/vocabulary/`) populating canonical lemmas mapped across Oxford 3000/5000 CEFR levels, NGSL frequencies, and WordNet definitions.

---

## 🛠 Tech Stack

- **Monorepo**: [pnpm](https://pnpm.io/) workspaces
- **Frontend & Fullstack API**: [Next.js 14](https://nextjs.org/) (App Router, Route Handlers, React Server Components, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth**: [Supabase](https://supabase.com/) / [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/)
- **Archive Extraction**: [JSZip](https://stuk.github.io/jszip/)

---

## 📁 Repository Structure

```
ROSP/
├── apps/
│   └── web/                   # Next.js Fullstack application (Frontend + /api)
│       └── src/
│           ├── app/           # Pages (/dashboard, /lists, /vocabulary, /review, /onboarding)
│           ├── components/    # UI presentation & interactive client components
│           └── lib/           # Learning algorithms, LLM, Supabase SSR, Anki parser, Services
├── packages/
│   ├── db/                    # Centralized Prisma schema, migrations, and database client
│   └── shared/                # Shared Zod schemas, contract DTOs, and constants
├── supabase/
│   ├── migrations/            # Production Supabase PostgreSQL migrations with RLS policies
│   └── seed.sql               # Canonical seed dataset for Supabase
├── scripts/
│   └── vocabulary/            # Oxford/NGSL/WordNet vocabulary ingestion pipeline
├── docs/
│   ├── architecture.md        # Architectural and algorithmic documentation
│   └── database.md            # Schema design, RLS policies, and index specifications
├── .env.example               # Environment variables template
├── pnpm-workspace.yaml        # Workspace configuration
└── package.json               # Root monorepo scripts
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: v18.17+ or v20+ (tested on Node.js v24)
2. **pnpm**: v9+ (tested on v12)
3. **PostgreSQL**: PostgreSQL 14+ running locally or a Supabase project

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/kanishkautag/ROSP-.git
cd ROSP-
pnpm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Configure your credentials:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/rosp_db?schema=public"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
LLM_PROVIDER="ollama" # or "groq"
OLLAMA_BASE_URL="http://localhost:11434"
GROQ_API_KEY=""
```

### 3. Initialize Database & Ingest Vocabulary

```bash
# Push database schema
pnpm db:push

# Ingest canonical CEFR vocabulary (Oxford 3000 / NGSL / WordNet)
pnpm vocab:ingest
```

*(Optional for Supabase CLI: `supabase db reset` applies `supabase/migrations/` and `supabase/seed.sql`)*

### 4. Run Development Server

```bash
pnpm dev
```

Visit the application at:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **Onboarding Wizard**: [http://localhost:3000/onboarding](http://localhost:3000/onboarding)
- **Gamified Dashboard**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Word Lists & Anki Import**: [http://localhost:3000/lists](http://localhost:3000/lists)
- **Vocabulary Catalog**: [http://localhost:3000/vocabulary](http://localhost:3000/vocabulary)
- **AI Review Session**: [http://localhost:3000/review](http://localhost:3000/review)

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Next.js development server at port 3000 |
| `pnpm build` | Builds `@rosp/shared`, `@rosp/db`, and `@rosp/web` for production |
| `pnpm lint` | Runs ESLint across all packages |
| `pnpm typecheck` | Runs TypeScript type checking across all workspaces |
| `pnpm vocab:ingest` | Runs the vocabulary ingestion pipeline into PostgreSQL |
| `pnpm db:push` | Pushes Prisma schema state directly to PostgreSQL |
| `pnpm db:studio` | Launches Prisma Studio GUI |

---

## 📖 Documentation

- [System Architecture](docs/architecture.md)
- [Database Schema & RLS Policies](docs/database.md)
