# ROSP Database Architecture & Schema Design

ROSP utilizes **PostgreSQL** managed through **Prisma ORM** located in `@rosp/db`. The schema balances normalized relational data modeling with flexibility for future spaced repetition and AI exercise extensions.

---

## 1. Entity Relationship Overview

```
User (1) ──────────< (N) WordList (1) ──────────< (N) WordListItem
 │                                                          │ (N)
 │                                                          │
 │ (1)                                                      ▼
 ├──────────< (N) UserWord (N) ────────────────── (1) VocabularyWord
 │                   │ (1)
 │                   ├────────── (1) LearningState (SM2 / FSRS parameters)
 │                   │
 │                   └──────────< (N) ReviewAttempt (append-only review logs)
 │                                          │ (1)
 │                                          ▼
 └────────────────────────────────────< (N) Exercise (AI generated prompt)
```

---

## 2. Core Models

### `User`, `Account`, `Session`
- Implements Auth.js / NextAuth OAuth2 schema.
- All identifiers use UUIDs (`@default(uuid())`).
- `Account` enforces `@@unique([provider, providerAccountId])`.

### `WordList` & `WordListItem`
- Users can create multiple custom lists (e.g., "Spanish Travel", "Oxford 3000").
- Words belong to lists through `WordListItem` with a compound unique constraint:
  `@@unique([wordListId, vocabularyWordId])`
- This many-to-many decoupling allows words to exist across multiple lists without data duplication.

### `VocabularyWord`
- Canonical vocabulary dictionary item.
- Contains linguistic metadata: `word`, `language`, `meaning`, `example`, `partOfSpeech`, `cefrLevel`, `frequency`, `frequencyRank`, `source`.
- Independent of user progress; shared globally across learners.

### `UserWord`
- Relates a `User` to a specific `VocabularyWord`.
- Compound unique constraint: `@@unique([userId, vocabularyWordId])`.
- Decouples user learning progress from the dictionary entity so multiple learners advance at individual rates.

### `LearningState`
- Stores current spaced repetition scheduling state for each `UserWord` (1-to-1).
- Supports both **SM2** (`repetitions`, `interval`, `easeFactor`) and **FSRS** (`difficulty`, `stability`, `retrievability`).
- Contains `nextReviewAt` timestamp used to query due cards efficiently.

### `ReviewAttempt` (Append-Only Log)
- Every user review action appends an immutable entry to `ReviewAttempt`.
- Stores `rating`, `correct`, `previousInterval`, `newInterval`, `previousEaseFactor`, `newEaseFactor`, and `reviewedAt`.
- Previous attempts are never modified, ensuring auditability and training data for future FSRS model optimization.

### `Exercise`
- Records AI-generated exercises tied to review events.
- Stores `type` (`FILL_BLANK`, `MULTIPLE_CHOICE`, `SENTENCE_CONSTRUCTION`), `question`, `options`, `answer`, `explanation`, `provider` (`OLLAMA`, `GROQ`), and `model`.

---

## 3. Indexes & Constraints

| Model | Index / Constraint | Purpose |
|---|---|---|
| `WordList` | `@@index([userId])` | Fast retrieval of user collections |
| `VocabularyWord` | `@@index([word])` | Fast lexical search & lookups |
| `VocabularyWord` | `@@index([language])` | Language-specific filtering |
| `WordListItem` | `@@unique([wordListId, vocabularyWordId])` | Prevent duplicate items in lists |
| `UserWord` | `@@unique([userId, vocabularyWordId])` | One progress tracker per user-word pair |
| `UserWord` | `@@index([userId])` | Dashboard queries for user vocabulary |
| `LearningState` | `@unique([userWordId])` | 1:1 relation with UserWord |
| `LearningState` | `@@index([nextReviewAt])` | Fast retrieval of due cards |
| `ReviewAttempt` | `@@index([userId])` | User streak and review history metrics |
| `ReviewAttempt` | `@@index([reviewedAt])` | Temporal analysis of study patterns |
| `Account` | `@@unique([provider, providerAccountId])` | OAuth provider account uniqueness |
