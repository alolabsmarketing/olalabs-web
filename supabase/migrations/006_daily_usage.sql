create table if not exists public.daily_usage (
  user_id       uuid not null references auth.users on delete cascade,
  date          date not null default current_date,
  session_count int not null default 0 check (session_count >= 0),
  voice_seconds int not null default 0 check (voice_seconds >= 0),
  primary key (user_id, date)
);

alter table public.daily_usage enable row level security;
create policy "users own their usage" on public.daily_usage
  for all using (auth.uid() = user_id);
