-- CreateEnum
CREATE TYPE "Algorithm" AS ENUM ('SM2', 'FSRS');

-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('FILL_BLANK', 'MULTIPLE_CHOICE', 'SENTENCE_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "LLMProvider" AS ENUM ('OLLAMA', 'GROQ');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "word_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabulary_words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'en',
    "meaning" TEXT NOT NULL,
    "example" TEXT,
    "partOfSpeech" TEXT,
    "cefrLevel" TEXT,
    "frequency" DOUBLE PRECISION,
    "frequencyRank" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vocabulary_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "word_list_items" (
    "id" TEXT NOT NULL,
    "wordListId" TEXT NOT NULL,
    "vocabularyWordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "word_list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_words" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vocabularyWordId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_states" (
    "id" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "algorithm" "Algorithm" NOT NULL DEFAULT 'SM2',
    "repetitions" INTEGER DEFAULT 0,
    "interval" DOUBLE PRECISION DEFAULT 0,
    "easeFactor" DOUBLE PRECISION DEFAULT 2.5,
    "difficulty" DOUBLE PRECISION,
    "stability" DOUBLE PRECISION,
    "retrievability" DOUBLE PRECISION,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userWordId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousInterval" DOUBLE PRECISION,
    "newInterval" DOUBLE PRECISION,
    "previousEaseFactor" DOUBLE PRECISION,
    "newEaseFactor" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "reviewAttemptId" TEXT,
    "type" "ExerciseType" NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT,
    "answer" TEXT NOT NULL,
    "explanation" TEXT,
    "provider" "LLMProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "word_lists_userId_idx" ON "word_lists"("userId");

-- CreateIndex
CREATE INDEX "vocabulary_words_word_idx" ON "vocabulary_words"("word");

-- CreateIndex
CREATE INDEX "vocabulary_words_language_idx" ON "vocabulary_words"("language");

-- CreateIndex
CREATE INDEX "word_list_items_wordListId_idx" ON "word_list_items"("wordListId");

-- CreateIndex
CREATE INDEX "word_list_items_vocabularyWordId_idx" ON "word_list_items"("vocabularyWordId");

-- CreateIndex
CREATE UNIQUE INDEX "word_list_items_wordListId_vocabularyWordId_key" ON "word_list_items"("wordListId", "vocabularyWordId");

-- CreateIndex
CREATE INDEX "user_words_userId_idx" ON "user_words"("userId");

-- CreateIndex
CREATE INDEX "user_words_vocabularyWordId_idx" ON "user_words"("vocabularyWordId");

-- CreateIndex
CREATE UNIQUE INDEX "user_words_userId_vocabularyWordId_key" ON "user_words"("userId", "vocabularyWordId");

-- CreateIndex
CREATE UNIQUE INDEX "learning_states_userWordId_key" ON "learning_states"("userWordId");

-- CreateIndex
CREATE INDEX "learning_states_userWordId_idx" ON "learning_states"("userWordId");

-- CreateIndex
CREATE INDEX "learning_states_nextReviewAt_idx" ON "learning_states"("nextReviewAt");

-- CreateIndex
CREATE INDEX "review_attempts_userId_idx" ON "review_attempts"("userId");

-- CreateIndex
CREATE INDEX "review_attempts_reviewedAt_idx" ON "review_attempts"("reviewedAt");

-- CreateIndex
CREATE INDEX "review_attempts_userWordId_idx" ON "review_attempts"("userWordId");

-- CreateIndex
CREATE INDEX "exercises_reviewAttemptId_idx" ON "exercises"("reviewAttemptId");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_lists" ADD CONSTRAINT "word_lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_wordListId_fkey" FOREIGN KEY ("wordListId") REFERENCES "word_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "word_list_items" ADD CONSTRAINT "word_list_items_vocabularyWordId_fkey" FOREIGN KEY ("vocabularyWordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_words" ADD CONSTRAINT "user_words_vocabularyWordId_fkey" FOREIGN KEY ("vocabularyWordId") REFERENCES "vocabulary_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_states" ADD CONSTRAINT "learning_states_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "user_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_userWordId_fkey" FOREIGN KEY ("userWordId") REFERENCES "user_words"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_reviewAttemptId_fkey" FOREIGN KEY ("reviewAttemptId") REFERENCES "review_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
