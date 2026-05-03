-- ============================================================
-- OlaLabs Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '',
  native_language TEXT NOT NULL DEFAULT 'Turkish',
  target_language TEXT NOT NULL DEFAULT 'English',
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'standard', 'pro', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions (practice sessions)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  character_id TEXT NOT NULL,
  scenario TEXT DEFAULT '',
  mode TEXT NOT NULL DEFAULT 'text' CHECK (mode IN ('text', 'voice')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- Messages (chat messages within a session)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Session analyses
CREATE TABLE IF NOT EXISTS public.session_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  grammar_score INTEGER,
  vocabulary_score INTEGER,
  fluency_score INTEGER,
  overall_score INTEGER,
  feedback_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_analyses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only read/update their own
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions
CREATE POLICY "sessions_select_own" ON public.sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.sessions FOR UPDATE USING (auth.uid() = user_id);

-- Messages
CREATE POLICY "messages_select_own" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "messages_insert_own" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid()));

-- Analyses
CREATE POLICY "analyses_select_own" ON public.session_analyses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid()));
CREATE POLICY "analyses_insert_own" ON public.session_analyses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions WHERE id = session_id AND user_id = auth.uid()));

-- ============================================================
-- Auto-update updated_at on profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
