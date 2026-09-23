# ROSP: AI Assisted Language Learning App with Spaced Repetition

ROSP is an academic mini-project designed to help language learners acquire vocabulary efficiently using modern spaced repetition algorithms (SuperMemo SM2 and FSRS) and contextual AI exercise generation (Ollama and Groq).

---

## 🛠 Tech Stack

- **Monorepo**: [pnpm](https://pnpm.io/) workspaces
- **Frontend & Fullstack API**: [Next.js](https://nextjs.org/) (App Router, Route Handlers, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Validation**: [Zod](https://zod.dev/)
- **Spaced Repetition**: Modular `LearningAlgorithm` abstraction (SM2, FSRS)
- **AI Exercise Generation**: Modular `LLMProvider` abstraction (Ollama, Groq)

---

## 📁 Repository Structure

```
ROSP/
├── apps/
│   └── web/                   # Next.js Fullstack application (Frontend + /api)
│       └── src/
│           ├── app/           # App Router pages and /api route handlers
│           ├── components/    # Reusable UI components
│           └── lib/           # Learning, LLM, Auth, Services, and Utilities
├── packages/
│   ├── db/                    # Prisma schema, migrations, seed, and client
│   └── shared/                # Zod schemas, contract DTOs, and constants
├── docs/
│   ├── architecture.md        # Architectural documentation
│   └── database.md            # Schema design, relationships, and indexes
├── .env.example               # Environment variables template
├── pnpm-workspace.yaml        # Workspace configuration
└── package.json               # Root monorepo scripts
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js**: v18.17+ or v20+ (tested on Node.js v24)
2. **pnpm**: v9+ (tested on v12)
3. **PostgreSQL**: PostgreSQL 14+ running locally or remotely

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

Ensure your `DATABASE_URL` matches your local PostgreSQL connection credentials:

```env
DATABASE_URL="postgresql://postgres:admin@localhost:5432/rosp_db?schema=public"
AUTH_SECRET="development-auth-secret-rosp-2026-secure-random"
OLLAMA_BASE_URL="http://localhost:11434"
```

### 3. Initialize & Seed Database

```bash
# Push schema or run migrations
pnpm db:push

# Seed development user and "English Basics" vocabulary
pnpm db:seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application:
- **Landing Page**: `http://localhost:3000/`
- **Dashboard**: `http://localhost:3000/dashboard`
- **Word Lists**: `http://localhost:3000/lists`
- **Review Session**: `http://localhost:3000/review`
- **API Health Endpoint**: `http://localhost:3000/api/health`

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts Next.js development server at port 3000 |
| `pnpm build` | Builds `@rosp/shared`, `@rosp/db`, and `@rosp/web` |
| `pnpm lint` | Runs ESLint across all workspace packages |
| `pnpm typecheck` | Validates TypeScript types across the monorepo |
| `pnpm db:generate`| Generates Prisma Client from schema |
| `pnpm db:push` | Pushes schema state directly to the database |
| `pnpm db:migrate` | Runs Prisma development migrations |
| `pnpm db:seed` | Populates sample words and default user |
| `pnpm db:studio` | Launches Prisma Studio GUI |

---

## 📖 Documentation

- [Architecture Design](docs/architecture.md)
- [Database Schema & Indexing](docs/database.md)
