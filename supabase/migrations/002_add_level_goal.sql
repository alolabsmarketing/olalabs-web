-- supabase/migrations/002_add_level_goal.sql
-- level/goal NULL = user hasn't completed onboarding yet (used as sentinel for onboarding detection)
alter table public.profiles
  add column if not exists level text check (level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists goal text check (goal in ('travel', 'work', 'casual', 'exam'));
