-- ROSP Supabase Initial Migration
-- PostgreSQL with Row Level Security (RLS) for AI-Assisted Language Learning with Spaced Repetition

-- 1. Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    native_language TEXT NOT NULL DEFAULT 'en',
    target_language TEXT NOT NULL DEFAULT 'es',
    cefr_level TEXT NOT NULL DEFAULT 'B1' CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    daily_goal INT NOT NULL DEFAULT 20 CHECK (daily_goal >= 5 AND daily_goal <= 100),
    algorithm TEXT NOT NULL DEFAULT 'SM2' CHECK (algorithm IN ('SM2', 'FSRS')),
    xp INT NOT NULL DEFAULT 0,
    streak INT NOT NULL DEFAULT 0,
    last_active_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Vocabulary Words (Canonical Dictionary)
CREATE TABLE IF NOT EXISTS public.vocabulary_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    part_of_speech TEXT,
    cefr_level TEXT CHECK (cefr_level IN ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')),
    frequency FLOAT,
    frequency_rank INT,
    source TEXT,
    definition TEXT NOT NULL,
    example TEXT,
    synonyms TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_word ON public.vocabulary_words(word);
CREATE INDEX IF NOT EXISTS idx_vocab_language ON public.vocabulary_words(language);
CREATE INDEX IF NOT EXISTS idx_vocab_cefr ON public.vocabulary_words(cefr_level);

-- 3. Word Lists (User collections)
CREATE TABLE IF NOT EXISTS public.word_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_lists_user ON public.word_lists(user_id);

-- 4. Word List Items (Many-to-Many word membership)
CREATE TABLE IF NOT EXISTS public.word_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word_list_id UUID NOT NULL REFERENCES public.word_lists(id) ON DELETE CASCADE,
    vocabulary_word_id UUID NOT NULL REFERENCES public.vocabulary_words(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(word_list_id, vocabulary_word_id)
);

CREATE INDEX IF NOT EXISTS idx_wli_list ON public.word_list_items(word_list_id);
CREATE INDEX IF NOT EXISTS idx_wli_vocab ON public.word_list_items(vocabulary_word_id);

-- 5. User Words (User study tracking for each word)
CREATE TABLE IF NOT EXISTS public.user_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vocabulary_word_id UUID NOT NULL REFERENCES public.vocabulary_words(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, vocabulary_word_id)
);

CREATE INDEX IF NOT EXISTS idx_user_words_user ON public.user_words(user_id);
CREATE INDEX IF NOT EXISTS idx_user_words_vocab ON public.user_words(vocabulary_word_id);

-- 6. Learning States (SM2 and FSRS spaced repetition state)
CREATE TABLE IF NOT EXISTS public.learning_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_word_id UUID NOT NULL UNIQUE REFERENCES public.user_words(id) ON DELETE CASCADE,
    algorithm TEXT NOT NULL DEFAULT 'SM2' CHECK (algorithm IN ('SM2', 'FSRS')),
    -- SM2 parameters
    repetitions INT NOT NULL DEFAULT 0,
    interval FLOAT NOT NULL DEFAULT 0,
    ease_factor FLOAT NOT NULL DEFAULT 2.5,
    -- FSRS parameters
    difficulty FLOAT DEFAULT 5.0,
    stability FLOAT DEFAULT 1.0,
    retrievability FLOAT DEFAULT 1.0,
    -- Scheduling
    last_reviewed_at TIMESTAMPTZ,
    next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learning_states_userword ON public.learning_states(user_word_id);
CREATE INDEX IF NOT EXISTS idx_learning_states_next_review ON public.learning_states(next_review_at);

-- 7. Review Sessions
CREATE TABLE IF NOT EXISTS public.review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cards_reviewed INT NOT NULL DEFAULT 0,
    correct_count INT NOT NULL DEFAULT 0,
    xp_earned INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_review_sessions_user ON public.review_sessions(user_id);

-- 8. Review Attempts (Append-only historical logs)
CREATE TABLE IF NOT EXISTS public.review_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_word_id UUID NOT NULL REFERENCES public.user_words(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.review_sessions(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 4), -- 1: Again, 2: Hard, 3: Good, 4: Easy
    correct BOOLEAN NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    previous_interval FLOAT,
    new_interval FLOAT,
    previous_ease_factor FLOAT,
    new_ease_factor FLOAT,
    response_time_ms INT
);

CREATE INDEX IF NOT EXISTS idx_review_attempts_user ON public.review_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_review_attempts_reviewed_at ON public.review_attempts(reviewed_at);
CREATE INDEX IF NOT EXISTS idx_review_attempts_user_word ON public.review_attempts(user_word_id);

-- 9. Exercises (AI & Template generated items)
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_attempt_id UUID REFERENCES public.review_attempts(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('FILL_BLANK', 'MULTIPLE_CHOICE', 'SENTENCE_CONSTRUCTION')),
    question TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    explanation TEXT,
    provider TEXT NOT NULL CHECK (provider IN ('OLLAMA', 'GROQ', 'FALLBACK')),
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Profiles: users read and update their own profile
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Vocabulary Words: readable by everyone
CREATE POLICY "Public read for vocabulary_words" ON public.vocabulary_words
    FOR SELECT TO public USING (true);

-- Word Lists: users manage their own lists
CREATE POLICY "Users can read own word lists" ON public.word_lists
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own word lists" ON public.word_lists
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own word lists" ON public.word_lists
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own word lists" ON public.word_lists
    FOR DELETE USING (auth.uid() = user_id);

-- Word List Items: accessible if user owns the parent word list
CREATE POLICY "Users can view items of own lists" ON public.word_list_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.word_lists WHERE id = word_list_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can insert items to own lists" ON public.word_list_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.word_lists WHERE id = word_list_id AND user_id = auth.uid())
    );

CREATE POLICY "Users can delete items from own lists" ON public.word_list_items
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.word_lists WHERE id = word_list_id AND user_id = auth.uid())
    );

-- User Words: user isolation
CREATE POLICY "Users can manage own user_words" ON public.user_words
    FOR ALL USING (auth.uid() = user_id);

-- Learning States: user isolation through user_words
CREATE POLICY "Users can manage own learning_states" ON public.learning_states
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_words WHERE id = user_word_id AND user_id = auth.uid())
    );

-- Review Sessions & Attempts: user isolation
CREATE POLICY "Users can manage own review_sessions" ON public.review_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own review_attempts" ON public.review_attempts
    FOR ALL USING (auth.uid() = user_id);

-- Exercises: accessible to creator of linked review attempt or public read
CREATE POLICY "Users can read exercises" ON public.exercises
    FOR SELECT USING (true);

CREATE POLICY "Users can insert exercises" ON public.exercises
    FOR INSERT WITH CHECK (true);

-- ==========================================
-- AUTOMATIC PROFILE TRIGGER ON USER SIGNUP
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
