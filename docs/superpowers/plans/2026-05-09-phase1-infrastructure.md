# Phase 1: Temel Altyapı — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase şeması, auth middleware, session kaydı, profil dropdown ve profil sayfasını ekleyerek OlaLabs'i production-ready hale getirmek.

**Architecture:** Mevcut custom auth cookie sistemi (sb-access-token) korunur. Middleware cookie varlığını kontrol eder. API route'lar supabaseAdmin.auth.getUser(token) ile user_id alır. Session kayıt akışı: isInitial→session oluştur→sessionId dön→her mesajda kaydet→analiz bitince analiz_results'a yaz.

**Tech Stack:** Next.js 16.2.4, TypeScript, Supabase (@supabase/supabase-js + @supabase/ssr), Tailwind CSS v4, Lucide React

---

## Task 1: Supabase Veritabanı Şeması

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

```sql
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
```

- [ ] **Step 2: Migration'ı Supabase'e uygula**

Supabase Dashboard → SQL Editor → migration dosyasının içeriğini yapıştır → Run

Alternatif (supabase CLI yüklüyse):
```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web
npx supabase db push
```

- [ ] **Step 3: Tabloları doğrula**

Supabase Dashboard → Table Editor → şu tabloların oluştuğunu kontrol et:
- `profiles`, `sessions`, `messages`, `analysis_results`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/001_initial_schema.sql
git commit -m "feat(db): add initial schema - profiles, sessions, messages, analysis_results with RLS"
```

---

## Task 2: Auth Server Helper

**Files:**
- Create: `lib/auth-server.ts`

- [ ] **Step 1: lib/auth-server.ts oluştur**

```typescript
// lib/auth-server.ts
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth-server.ts
git commit -m "feat(auth): add server-side user resolution helper"
```

---

## Task 3: Auth Middleware

**Files:**
- Create: `middleware.ts` (proje kökünde, app/ ile aynı seviyede)

- [ ] **Step 1: middleware.ts oluştur**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/practice", "/profile", "/characters"];
const AUTH_ONLY = ["/login", "/register"];

export function middleware(req: NextRequest) {
  const token = req.cookies.get("sb-access-token")?.value;
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED.some((r) => pathname.startsWith(r));
  const isAuthOnly = AUTH_ONLY.some((r) => pathname.startsWith(r));

  if (isProtected && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthOnly && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
```

- [ ] **Step 2: Middleware'i test et**

Dev server çalıştır:
```bash
npm run dev
```

Tarayıcıda giriş yapmadan `/dashboard` aç → `/login`'e yönlenmeli.
Giriş yapıktan sonra `/login` aç → `/dashboard`'a yönlenmeli.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): add middleware for protected routes"
```

---

## Task 4: Chat API — Session Oluşturma ve Mesaj Kaydı

**Files:**
- Modify: `app/api/chat/route.ts`

- [ ] **Step 1: chat/route.ts'i tamamen yeniden yaz**

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { anthropic } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";
import type { Character } from "@/lib/characters";

function loadCharacter(id: string): Character | undefined {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "data", "characters.json"), "utf-8"));
    return data.find((c: Character) => c.id === id);
  } catch {
    return undefined;
  }
}

const MAX_TOKENS: Record<string, number> = {
  very_short: 80,
  short: 130,
  medium: 200,
  long: 300,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API key is missing. Please set ANTHROPIC_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  try {
    const { characterId, scenario, messages, isInitial, sessionId } = await req.json();

    const character = loadCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const scenarioPart = scenario
      ? `\n\nSCENARIO SET BY USER: "${scenario}"\nAdapt naturally to this scenario while keeping your character identity.`
      : "";

    const systemPrompt = character.systemPrompt + scenarioPart;
    const maxTokens = MAX_TOKENS[character.style.responseLength] ?? 150;

    // Kullanıcıyı tanımla (giriş yapmamış kullanıcılar demo modda)
    const userId = await getUserIdFromRequest(req);

    if (isInitial) {
      const initMessage = scenario
        ? `The user wants to practice English. Start the session in character. The scenario is: "${scenario}". Open the conversation naturally as your character would in this situation.`
        : "The user wants to practice English. Start the session with a natural opening that reflects your character. Don't say 'How can I help you?' — open in a way that's true to who you are.";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: initMessage }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";

      // Giriş yapmış kullanıcı için session oluştur
      let newSessionId: string | null = null;
      if (userId) {
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .insert({ user_id: userId, character_id: characterId, scenario: scenario ?? null })
          .select("id")
          .single();

        if (session) {
          newSessionId = session.id;
          // İlk asistan mesajını kaydet
          await supabaseAdmin.from("messages").insert({
            session_id: session.id,
            role: "assistant",
            content,
          });
        }
      }

      return NextResponse.json({ content, sessionId: newSessionId });
    }

    // Normal mesaj akışı
    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    // Mesajları DB'ye kaydet
    if (userId && sessionId) {
      const lastUserMessage = messages[messages.length - 1];
      await supabaseAdmin.from("messages").insert([
        { session_id: sessionId, role: "user", content: lastUserMessage.content },
        { session_id: sessionId, role: "assistant", content },
      ]);

      // message_count güncelle
      await supabaseAdmin
        .from("sessions")
        .update({ message_count: messages.length + 1 })
        .eq("id", sessionId);
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat(api): add session creation and message recording to chat endpoint"
```

---

## Task 5: Practice Sayfası — sessionId State

**Files:**
- Modify: `app/practice/page.tsx`

- [ ] **Step 1: sessionId state ekle ve chat fonksiyonunu güncelle**

`app/practice/page.tsx` içinde `useState` importları bulunduğu bölümde `sessionId` state'ini ekle:

```typescript
const [sessionId, setSessionId] = useState<string | null>(null);
```

- [ ] **Step 2: startSession fonksiyonunu güncelle**

`isInitial: true` ile yapılan fetch çağrısını bul ve response'tan sessionId'yi oku:

```typescript
// isInitial fetch bloğunda, response.content'i aldıktan sonra:
const data = await res.json();
if (data.sessionId) setSessionId(data.sessionId);
const content = data.content;
```

- [ ] **Step 3: sendMessage fonksiyonunu güncelle**

Normal mesaj gönderiminde sessionId'yi ekle:

```typescript
// fetch body'sine sessionId ekle:
body: JSON.stringify({
  characterId,
  scenario,
  messages: updatedMessages,
  sessionId, // <-- bunu ekle
}),
```

- [ ] **Step 4: Uçtan uca test et**

1. Giriş yap
2. Practice sayfasına git, bir karakter seç
3. 3-4 mesaj yaz
4. Supabase Dashboard → Table Editor → `sessions` ve `messages` tablolarında kayıtlar var mı kontrol et

- [ ] **Step 5: Commit**

```bash
git add app/practice/page.tsx
git commit -m "feat(practice): pass sessionId for message recording"
```

---

## Task 6: Analysis API — Analiz Sonuçlarını Kaydet

**Files:**
- Modify: `app/api/analysis/route.ts`

- [ ] **Step 1: analysis/route.ts'i güncelle**

```typescript
// app/api/analysis/route.ts
import { NextRequest, NextResponse } from "next/server";
import { anthropic, ANALYSIS_PROMPT } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages, sessionId } = await req.json();

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: ANALYSIS_PROMPT,
      messages: [{ role: "user", content: `Analyze this conversation:\n\n${conversationText}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Giriş yapmış kullanıcı + geçerli session varsa DB'ye kaydet
    const userId = await getUserIdFromRequest(req);
    if (userId && sessionId) {
      await supabaseAdmin.from("analysis_results").insert({
        session_id: sessionId,
        grammar_score: analysis.grammar ?? null,
        vocabulary_score: analysis.vocabulary ?? null,
        fluency_score: analysis.fluency ?? null,
        feedback: analysis,
      });

      // Session'ı kapat
      await supabaseAdmin
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Practice sayfasında analysis çağrısına sessionId ekle**

`app/practice/page.tsx` içinde analysis fetch çağrısını bul ve sessionId'yi gönder:

```typescript
body: JSON.stringify({ messages, sessionId }),
```

- [ ] **Step 3: Commit**

```bash
git add app/api/analysis/route.ts app/practice/page.tsx
git commit -m "feat(api): save analysis results and close session on completion"
```

---

## Task 7: Sessions API Endpoint

**Files:**
- Create: `app/api/sessions/route.ts`
- Create: `app/api/sessions/[id]/route.ts`

- [ ] **Step 1: app/api/sessions/route.ts oluştur**

```typescript
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      analysis_results (
        grammar_score,
        vocabulary_score,
        fluency_score
      )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}
```

- [ ] **Step 2: app/api/sessions/[id]/route.ts oluştur**

```typescript
// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      messages (role, content, created_at),
      analysis_results (grammar_score, vocabulary_score, fluency_score, feedback)
    `)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/sessions/route.ts app/api/sessions/[id]/route.ts
git commit -m "feat(api): add sessions list and detail endpoints"
```

---

## Task 8: Profile Dropdown Bileşeni

**Files:**
- Create: `components/ProfileDropdown.tsx`

- [ ] **Step 1: ProfileDropdown.tsx oluştur**

```typescript
// components/ProfileDropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";

interface ProfileDropdownProps {
  email?: string;
  plan?: string;
}

export function ProfileDropdown({ email = "", plan = "free" }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = email ? email[0].toUpperCase() : "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-white/70 hover:text-white transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
          {initials}
        </div>
        <span className="text-sm hidden sm:block">{email.split("@")[0]}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 glass-card py-1 z-50">
          <div className="px-4 py-2 border-b border-white/10">
            <p className="text-white text-sm font-medium truncate">{email}</p>
            <p className="text-white/40 text-xs capitalize">{plan} plan</p>
          </div>
          <button
            onClick={() => { setOpen(false); router.push("/profile"); }}
            className="w-full flex items-center gap-2 px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors text-sm"
          >
            <User size={14} /> Profil
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors text-sm"
          >
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ProfileDropdown.tsx
git commit -m "feat(ui): add ProfileDropdown component with logout"
```

---

## Task 9: Dashboard — Gerçek İstatistikler + ProfileDropdown

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: dashboard/page.tsx'i güncelle**

`"use client"` direktifini kaldır (server component olacak), içeriği değiştir:

```typescript
// app/dashboard/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { CHARACTERS } from "@/lib/characters";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ArrowRight, MessageCircle, Clock, Star, Settings2 } from "lucide-react";

async function getUserData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count")
    .eq("id", user.id)
    .single();

  const { data: recentSessions } = await supabaseAdmin
    .from("sessions")
    .select("started_at, ended_at, analysis_results(grammar_score, vocabulary_score, fluency_score)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(10);

  // Ortalama skor hesapla
  const scores = (recentSessions ?? [])
    .flatMap((s: { analysis_results: Array<{ grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }> }) => s.analysis_results ?? [])
    .map((a: { grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }) =>
      ((a.grammar_score ?? 0) + (a.vocabulary_score ?? 0) + (a.fluency_score ?? 0)) / 3
    )
    .filter((s: number) => s > 0);

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;

  // Toplam pratik süresi (dakika cinsinden, ended_at - started_at)
  const totalMinutes = (recentSessions ?? [])
    .filter((s: { ended_at: string | null }) => s.ended_at)
    .reduce((acc: number, s: { started_at: string; ended_at: string | null }) => {
      const mins = Math.round((new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000);
      return acc + Math.max(0, mins);
    }, 0);

  return {
    email: profile?.email ?? user.email ?? "",
    plan: profile?.plan ?? "free",
    sessionsCount: profile?.sessions_count ?? 0,
    totalMinutes,
    avgScore,
  };
}

export default async function DashboardPage() {
  const userData = await getUserData();
  const featured = CHARACTERS.find((c) => c.featured)!;
  const others = CHARACTERS.filter((c) => !c.featured);

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight">OLA</Link>
          <nav className="flex items-center gap-4 text-white/60 text-sm">
            <Link href="/dashboard" className="text-white font-medium">Home</Link>
            <Link href="/characters/editor" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Settings2 size={14} /> Characters
            </Link>
            <Link href="/practice" className="hover:text-white transition-colors">Practice</Link>
            {userData && (
              <ProfileDropdown email={userData.email} plan={userData.plan} />
            )}
          </nav>
        </header>

        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-white text-2xl font-bold">
            {userData ? `Hoş geldin, ${userData.email.split("@")[0]}.` : "Good to see you."}
          </h2>
          <p className="text-white/50 text-sm mt-1">Choose a character and start practicing.</p>
        </div>

        {/* Featured character */}
        <div className="glass-card p-6 mb-6 flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-white/30"
            style={{ background: `radial-gradient(circle, ${featured.color}30, transparent)` }}
          >
            <span className="text-2xl font-bold" style={{ color: featured.color }}>
              {featured.avatarInitials}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 text-xs font-semibold">★ FEATURED</span>
            </div>
            <h3 className="text-white text-lg font-bold">{featured.name}</h3>
            <p className="text-blue-300 text-sm">{featured.role}</p>
            <p className="text-white/50 text-sm mt-1">{featured.description}</p>
          </div>
          <Link
            href={`/practice?character=${featured.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all flex-shrink-0"
          >
            Start <ArrowRight size={14} />
          </Link>
        </div>

        {/* Other characters */}
        <h3 className="text-white/70 text-sm font-medium mb-4">All Characters</h3>
        <div className="grid grid-cols-2 gap-4 mb-10">
          {others.map((char) => (
            <Link
              key={char.id}
              href={`/practice?character=${char.id}`}
              className="glass-card p-5 flex items-center gap-4 hover:bg-white/10 transition-all"
            >
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border border-white/20"
                style={{ background: `radial-gradient(circle, ${char.color}30, transparent)` }}
              >
                <span className="text-sm font-bold" style={{ color: char.color }}>
                  {char.avatarInitials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{char.name}</p>
                <p className="text-white/50 text-xs truncate">{char.role}</p>
              </div>
              <ArrowRight size={14} className="text-white/30 flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Gerçek istatistikler */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: MessageCircle,
              label: "Sessions",
              value: userData ? String(userData.sessionsCount) : "0",
            },
            {
              icon: Clock,
              label: "Hours practiced",
              value: userData && userData.totalMinutes > 0
                ? `${Math.floor(userData.totalMinutes / 60)}h ${userData.totalMinutes % 60}m`
                : "0h",
            },
            {
              icon: Star,
              label: "Avg. score",
              value: userData?.avgScore ? `${userData.avgScore}%` : "—",
            },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <Icon size={20} className="text-white/40 mx-auto mb-2" />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/50 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat(dashboard): add real stats from DB and ProfileDropdown"
```

---

## Task 10: Profil Sayfası

**Files:**
- Create: `app/profile/page.tsx`

- [ ] **Step 1: app/profile/page.tsx oluştur**

```typescript
// app/profile/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { ArrowLeft, MessageCircle, Star, Calendar } from "lucide-react";

async function getProfileData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, plan, sessions_count, created_at")
    .eq("id", user.id)
    .single();

  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      analysis_results (grammar_score, vocabulary_score, fluency_score)
    `)
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(20);

  return { profile, sessions: sessions ?? [], userId: user.id };
}

function avgScore(analysis: Array<{ grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }>) {
  if (!analysis.length) return null;
  const a = analysis[0];
  const vals = [a.grammar_score, a.vocabulary_score, a.fluency_score].filter((v): v is number => v !== null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export default async function ProfilePage() {
  const data = await getProfileData();
  if (!data) return null;

  const { profile, sessions } = data;
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })
    : "—";

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Dashboard
          </Link>
          <ProfileDropdown email={profile?.email ?? ""} plan={profile?.plan ?? "free"} />
        </header>

        {/* Profil kartı */}
        <div className="glass-card p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
              {(profile?.email ?? "?")[0].toUpperCase()}
            </div>
            <div>
              <p className="text-white font-bold text-lg">{profile?.email}</p>
              <p className="text-white/50 text-sm capitalize">{profile?.plan ?? "free"} plan · {memberSince}'dan beri</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Toplam Oturum", value: String(profile?.sessions_count ?? 0), icon: MessageCircle },
              { label: "Son 20 Ort. Skor", value: (() => {
                const scores = sessions
                  .flatMap((s) => s.analysis_results ?? [])
                  .map((a) => avgScore([a]))
                  .filter((s): s is number => s !== null);
                return scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : "—";
              })(), icon: Star },
              { label: "Üye Tarihi", value: memberSince, icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <Icon size={16} className="text-white/40 mx-auto mb-1" />
                <p className="text-white font-bold">{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Oturum geçmişi */}
        <h3 className="text-white/70 text-sm font-medium mb-3">Oturum Geçmişi</h3>
        {sessions.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <p className="text-white/40 text-sm">Henüz oturum yok.</p>
            <Link href="/practice" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
              İlk oturumu başlat →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const score = avgScore(session.analysis_results ?? []);
              const duration = session.ended_at
                ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
                : null;

              return (
                <div key={session.id} className="glass-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium capitalize">{session.character_id}</p>
                    {session.scenario && (
                      <p className="text-white/40 text-xs truncate">{session.scenario}</p>
                    )}
                    <p className="text-white/30 text-xs mt-0.5">
                      {new Date(session.started_at).toLocaleDateString("tr-TR")}
                      {duration ? ` · ${duration} dk` : ""}
                      {" · "}{session.message_count} mesaj
                    </p>
                  </div>
                  {score !== null && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold">{score}%</p>
                      <p className="text-white/40 text-xs">skor</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Uygulamayı test et**

1. Birkaç oturum yaptıktan sonra `/profile` sayfasını aç
2. Oturum geçmişi, skor ve istatistikler görünüyor mu kontrol et
3. Logout düğmesi çalışıyor mu test et

- [ ] **Step 3: Final commit**

```bash
git add app/profile/page.tsx
git commit -m "feat(profile): add profile page with session history and stats"
```

---

## Self-Review Checklist

- [x] Spec kapsamı: profiles, sessions, messages, analysis_results → Task 1 ✓
- [x] Auth middleware → Task 3 ✓
- [x] Session kayıt (chat) → Task 4 + Task 5 ✓
- [x] Analysis kayıt → Task 6 ✓
- [x] Sessions API → Task 7 ✓
- [x] ProfileDropdown + logout → Task 8 + Task 9 ✓
- [x] Profil sayfası → Task 10 ✓
- [x] Type tutarlılığı: `getUserIdFromRequest` Task 2'de tanımlandı, Task 4/5/6/7'de kullanıldı ✓
- [x] Placeholder yok: tüm adımlarda gerçek kod var ✓
- [x] Sıralama: DB şeması (T1) → helper (T2) → middleware (T3) → API (T4-7) → UI (T8-10) ✓
