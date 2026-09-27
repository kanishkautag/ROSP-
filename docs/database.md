# ROSP Database Architecture & Schema Design

ROSP utilizes a normalized relational schema deployed on **PostgreSQL** with Row Level Security (RLS) policies for Supabase and Prisma ORM client compatibility.

---

## 1. Entity Relationship Overview

```
auth.users (1) ────────── (1) profiles
   │
   ├──────────< (N) word_lists (1) ──────────< (N) word_list_items
   │                                                    │ (N)
   │                                                    │
   │ (1)                                                ▼
   ├──────────< (N) user_words (N) ─────────── (1) vocabulary_words
   │                   │ (1)
   │                   ├────────── (1) learning_states (SM2 / FSRS parameters)
   │                   │
   │                   └──────────< (N) review_attempts (append-only review logs)
   │                                           │ (1)
   │                                           ▼
   └─────────────────────────────────────< (N) exercises (AI exercise prompts)
```

---

## 2. Core Entities & Security

### `profiles` (Row Level Security Enabled)
- Links directly to `auth.users(id)`.
- Automatically provisioned upon user signup via PostgreSQL trigger `on_auth_user_created`.
- Stores user learning preferences: `native_language`, `target_language`, `cefr_level`, `daily_goal`, `algorithm`, `xp`, `streak`.
- **RLS Policy**: Users may only SELECT and UPDATE their own profile (`auth.uid() = id`).

### `vocabulary_words` (Global Catalog)
- Canonical lexical repository independent of user ownership.
- Linguistic fields: `word`, `language`, `meaning`, `example`, `part_of_speech`, `cefr_level`, `frequency_rank`, `source`.
- **RLS Policy**: Publicly readable by all authenticated users; writable by admins.

### `word_lists` & `word_list_items`
- User-created vocabulary decks (e.g., "Spanish Travel", "Business C1").
- `word_list_items` enforces uniqueness per list: `UNIQUE(word_list_id, vocabulary_word_id)`.
- **RLS Policy**: Users may only access and modify lists they created (`auth.uid() = user_id`).

### `user_words`
- Connects a user to a `vocabulary_words` item.
- Enforces uniqueness: `UNIQUE(user_id, vocabulary_word_id)`.
- Allows multiple learners to progress on the same canonical words independently.

### `learning_states`
- Stores active spaced repetition parameters for each `user_word` (1:1).
- **SM2**: `repetitions`, `interval` (days), `ease_factor`.
- **FSRS**: `difficulty`, `stability`, `retrievability`.
- `next_review_at`: Indexed timestamp used to filter due cards for review queues.

### `review_attempts` (Immutable Append-Only Log)
- Every completed card review appends an immutable record.
- Fields: `user_id`, `user_word_id`, `rating` (1 to 4), `correct`, `previous_interval`, `new_interval`, `previous_ease_factor`, `new_ease_factor`, `reviewed_at`.
- Historical log enables precision retention rate calculation, streak counting, and algorithmic auditing.

### `exercises`
- Stores contextual AI exercises generated for review attempts.
- Fields: `type` (`FILL_BLANK`, `MULTIPLE_CHOICE`, `SENTENCE_CONSTRUCTION`), `question`, `response`, `answer`, `explanation`, `provider`, `model`.

---

## 3. Key Indexes & Constraints

| Table | Index / Constraint | Purpose |
|---|---|---|
| `word_lists` | `INDEX(user_id)` | Fast lookup of user collections |
| `vocabulary_words` | `INDEX(word)` | High-speed lexical search |
| `vocabulary_words` | `INDEX(cefr_level)` | Fast filtering by CEFR proficiency |
| `word_list_items` | `UNIQUE(word_list_id, vocabulary_word_id)` | Prevent duplicate words in lists |
| `user_words` | `UNIQUE(user_id, vocabulary_word_id)` | Single progress tracker per user-word |
| `learning_states` | `INDEX(next_review_at)` | Fast retrieval of due review cards |
| `review_attempts` | `INDEX(user_id)` | Fast computation of streaks and statistics |
| `review_attempts` | `INDEX(reviewed_at)` | Temporal filtering for daily review goals |

---

## 4. Migrations & Seed Files

- **Supabase Migration**: `supabase/migrations/20260926000000_init_supabase.sql` contains the complete DDL, foreign keys, RLS policies, and triggers.
- **Supabase Seed**: `supabase/seed.sql` populates canonical CEFR vocabulary across levels A1 through C2.
- **Ingestion Script**: `pnpm vocab:ingest` loads vocabulary data into the active PostgreSQL database.
