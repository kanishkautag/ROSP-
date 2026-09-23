# ROSP Architecture & System Design

**ROSP (AI Assisted Language Learning App with Spaced Repetition)** is designed as an academic mini-project balancing clean software engineering patterns, modular extensibility, and minimal operational overhead.

---

## 1. High-Level Monorepo Structure

The project is structured as a lightweight `pnpm` monorepo:

```
ROSP/
├── apps/
│   └── web/                   # Next.js 14 App Router (Fullstack: Frontend + API Route Handlers)
│       ├── src/
│       │   ├── app/           # App router pages and HTTP route handlers (/api)
│       │   ├── components/    # Reusable UI presentation components
│       │   ├── lib/
│       │   │   ├── auth/      # Auth.js / OAuth2 configuration
│       │   │   ├── learning/  # LearningAlgorithm (SM2 / FSRS) abstractions & factory
│       │   │   ├── llm/       # LLMProvider (Ollama / Groq) abstractions & service
│       │   │   ├── services/  # Business logic & Prisma query orchestration
│       │   │   └── utils/     # Shared presentation utilities
│       │   └── types/         # Local application typings
├── packages/
│   ├── db/                    # Centralized Prisma schema, migrations, seeds, and client
│   └── shared/                # Zod schemas, contract DTOs, and constants
├── docs/                      # Architectural and database specifications
├── .env.example               # Standardized environment template
└── pnpm-workspace.yaml        # Monorepo workspace configuration
```

---

## 2. Fullstack Next.js (App Router)

To avoid managing separate backend and frontend deployments, ROSP hosts both within Next.js:
- **Client Pages**: Built with React Server Components (RSC) and Client Components with Tailwind CSS for aesthetic, responsive user interfaces.
- **Backend Route Handlers (`src/app/api/`)**: Handle HTTP concerns (deserialization, validation, status codes) and delegate business logic to `src/lib/services/`.
- **Architectural Flow**:
  $$\text{Route Handler} \longrightarrow \text{Service Logic} \longrightarrow \text{Prisma Client} \longrightarrow \text{PostgreSQL}$$

---

## 3. Learning Algorithm Abstraction

The spaced repetition system decouples the review engine from concrete scheduling mathematics through the `LearningAlgorithm` abstract class:

```
LearningAlgorithm
├── SM2Algorithm    (SuperMemo 2: repetitions, interval, easeFactor)
└── FSRSAlgorithm   (Free Spaced Repetition: difficulty, stability, retrievability)
```

- **Contracts**:
  - `initialize()`: Returns algorithm-specific initial learning parameters for new cards.
  - `schedule(currentState, review)`: Returns updated intervals and memory metrics based on recall performance ($1$ to $4$).
- **Factory Pattern (`LearningAlgorithmFactory`)**: Resolves algorithms dynamically by name without branching statements (`if (algorithm === "SM2")`) throughout review processing code.

---

## 4. LLM Provider Abstraction

AI-generated exercises (fill-in-the-blank, multiple choice, sentence construction) are decoupled from specific model backends:

```
LLMProvider
├── OllamaProvider (Local inference, default: http://localhost:11434)
└── GroqProvider   (Cloud inference via Groq API)
```

- **System-level Decision**: Model provider selection is an infrastructure configuration managed strictly through environment variables (`LLM_PROVIDER`, `GROQ_API_KEY`, `OLLAMA_BASE_URL`). The UI provides no provider toggle, keeping learner focus on study tasks.

---

## 5. Authentication Architecture

- Prepared for **OAuth2 (Google)** via Auth.js / NextAuth.
- No plaintext passwords or password hashes are stored.
- Database contains Auth.js compatible tables (`User`, `Account`, `Session`) mapped with UUID primary keys and provider unique constraints.
