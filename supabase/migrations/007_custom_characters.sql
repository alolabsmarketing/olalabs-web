-- supabase/migrations/007_custom_characters.sql

-- Custom characters table
CREATE TABLE custom_characters (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name              text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 50),
  relationship_hint text CHECK (char_length(relationship_hint) <= 100),
  personality_prompt text NOT NULL CHECK (char_length(personality_prompt) BETWEEN 10 AND 300),
  avatar_url        text,
  voice_id          text,
  memory_summary    text,
  memory_updated_at timestamptz,
  created_at        timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE custom_characters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own custom characters"
  ON custom_characters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own custom characters"
  ON custom_characters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own custom characters"
  ON custom_characters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own custom characters"
  ON custom_characters FOR DELETE
  USING (auth.uid() = user_id);

-- Index for lookups by user
CREATE INDEX custom_characters_user_id_idx ON custom_characters(user_id);

-- Add custom_character_id to sessions for memory tracking
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_character_id uuid REFERENCES custom_characters(id) ON DELETE SET NULL;
