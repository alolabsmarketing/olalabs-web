-- Adds Stripe subscription fields and language fields to profiles.
-- native_language = user's mother tongue (for explanations/corrections)
-- practice_language = language they are learning (app UI + AI conversation)
-- Replaces the old 'language' column (kept for backward compat).
alter table public.profiles
  add column if not exists native_language text not null default 'tr',
  add column if not exists practice_language text not null default 'en',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text default null,
  add column if not exists current_period_end timestamptz;

-- Migrate existing data: treat old UI language as practice_language
update public.profiles
  set practice_language = coalesce(language, 'en')
  where language is not null;
