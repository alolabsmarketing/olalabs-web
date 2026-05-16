alter table public.profiles
  add column if not exists language text check (language in ('en', 'tr')) default 'en';
