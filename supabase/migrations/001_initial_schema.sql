-- supabase/migrations/001_initial_schema.sql

-- PROFILES: Her auth kullanıcısı için otomatik oluşturulur
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'standard', 'pro', 'premium')),
  sessions_count integer not null default 0,
  total_minutes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SESSIONS: Kullanıcının pratik oturumları
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  character_id text not null,
  scenario text,
  message_count integer not null default 0,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

-- MESSAGES: Oturum içindeki mesajlar
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- ANALYSIS_RESULTS: Oturum sonu analizi
create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) on delete cascade not null,
  grammar_score integer check (grammar_score between 0 and 100),
  vocabulary_score integer check (vocabulary_score between 0 and 100),
  fluency_score integer check (fluency_score between 0 and 100),
  feedback jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS ETKİNLEŞTİR
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.analysis_results enable row level security;

-- PROFILES RLS
create policy "Kullanıcı kendi profilini görebilir"
  on public.profiles for select using (auth.uid() = id);
create policy "Kullanıcı kendi profilini güncelleyebilir"
  on public.profiles for update using (auth.uid() = id);

-- SESSIONS RLS
create policy "Kullanıcı kendi oturumlarını görebilir"
  on public.sessions for select using (auth.uid() = user_id);
create policy "Kullanıcı kendi oturumunu oluşturabilir"
  on public.sessions for insert with check (auth.uid() = user_id);
create policy "Kullanıcı kendi oturumunu güncelleyebilir"
  on public.sessions for update using (auth.uid() = user_id);

-- MESSAGES RLS
create policy "Kullanıcı kendi mesajlarını görebilir"
  on public.messages for select using (
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  );
create policy "Kullanıcı kendi mesajlarını ekleyebilir"
  on public.messages for insert with check (
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  );

-- ANALYSIS_RESULTS RLS
create policy "Kullanıcı kendi analizini görebilir"
  on public.analysis_results for select using (
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  );
create policy "Kullanıcı kendi analizini ekleyebilir"
  on public.analysis_results for insert with check (
    exists (select 1 from public.sessions where id = session_id and user_id = auth.uid())
  );

-- OTOMATİK PROFİL OLUŞTURMA TRİGGER'I
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SESSION_COUNT OTOMATİK GÜNCELLEME
create or replace function public.increment_session_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set sessions_count = sessions_count + 1,
      updated_at = now()
  where id = new.user_id;
  return new;
end;
$$;

create trigger on_session_created
  after insert on public.sessions
  for each row execute procedure public.increment_session_count();

-- PROFILES EMAIL UNIQUE CONSTRAINT
alter table public.profiles add constraint profiles_email_unique unique(email);

-- MESSAGE_COUNT OTOMATİK GÜNCELLEME
create or replace function public.increment_message_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.sessions
  set message_count = message_count + 1
  where id = new.session_id;
  return new;
end;
$$;

create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.increment_message_count();

-- PERFORMANS İNDEKSLERİ
create index idx_sessions_user_id on public.sessions(user_id);
create index idx_messages_session_id on public.messages(session_id);
create index idx_analysis_results_session_id on public.analysis_results(session_id);
