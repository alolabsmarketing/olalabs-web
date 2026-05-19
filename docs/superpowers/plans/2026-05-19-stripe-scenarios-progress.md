# OlaLabs v1.2 — Stripe + Scenarios + Progress Tracking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing (Free/Pro/Premium), scenario card selection, and progress tracking charts to OlaLabs.

**Architecture:** Task 1 (DB migrations) and Task 2 (shared utilities) must run first. Tasks 3–9 can then run in parallel (Stripe, Scenarios, Language arch). Tasks 10–11 (Progress tracking) run last.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase PostgreSQL, Stripe Checkout (hosted), recharts (install needed), Azure TTS

---

### Task 1: DB Migrations

**Files:**
- Create: `supabase/migrations/004_stripe_and_language.sql`
- Create: `supabase/migrations/005_scenarios.sql`
- Create: `supabase/migrations/006_daily_usage.sql`

- [ ] **Step 1: Create 004_stripe_and_language.sql**

```sql
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
```

- [ ] **Step 2: Create 005_scenarios.sql**

```sql
create table if not exists public.scenarios (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  category        text not null check (category in ('travel','work','daily','education','social')),
  icon            text not null,
  title_en        text not null,
  title_tr        text not null,
  description_en  text not null,
  description_tr  text not null,
  practice_language text not null default 'en',
  min_plan        text not null default 'free' check (min_plan in ('free','pro','premium')),
  sort_order      int not null default 0,
  created_at      timestamptz default now()
);

alter table public.scenarios enable row level security;
create policy "scenarios are public read" on public.scenarios for select using (true);

insert into public.scenarios
  (slug, category, icon, title_en, title_tr, description_en, description_tr, min_plan, sort_order)
values
  ('visa-interview',     'travel',    '✈️', 'Visa Interview',           'Vize Mülakatı',         'Practice for your embassy visa interview',          'Büyükelçilik vize mülakatına hazırlan',        'free', 1),
  ('restaurant-order',   'daily',     '🍽️', 'Ordering at a Restaurant', 'Restoranda Sipariş',    'Order food, ask questions, handle the bill',       'Yemek sipariş et, soru sor, hesap öde',        'free', 2),
  ('asking-directions',  'daily',     '🗺️', 'Asking for Directions',    'Yol Tarifi Sorma',      'Navigate an unfamiliar city with confidence',      'Yabancı bir şehirde güvenle yol bul',          'free', 3),
  ('job-interview',      'work',      '💼', 'Job Interview',            'İş Mülakatı',           'Ace your next job interview in English',           'İngilizce iş mülakatında başarılı ol',         'pro',  4),
  ('doctor-appointment', 'daily',     '🏥', 'Doctor Appointment',       'Doktor Randevusu',      'Describe symptoms and ask about treatment',        'Belirtileri anlat, tedavi hakkında sor',        'pro',  5),
  ('hotel-checkin',      'travel',    '🏨', 'Hotel Check-in',           'Otel Check-in',         'Check in, make requests, handle problems',         'Check-in yap, istek belirt, sorunları çöz',    'pro',  6),
  ('shopping',           'daily',     '🛍️', 'Shopping',                 'Alışveriş',             'Browse, ask about sizes and prices, buy items',   'Gez, beden/fiyat sor, satın al',               'pro',  7),
  ('business-meeting',   'work',      '📊', 'Business Meeting',         'İş Toplantısı',         'Lead or participate in a professional meeting',    'İş toplantısına önder veya katılımcı ol',      'pro',  8),
  ('airport-checkin',    'travel',    '🛫', 'Airport Check-in',         'Havaalanı Check-in',    'Navigate check-in, security, and boarding',        'Check-in, güvenlik ve biniş süreçlerini geç',  'pro',  9),
  ('university-campus',  'education', '🎓', 'University Campus',        'Üniversite Kampüsü',    'Ask about courses, registration, campus life',     'Dersler, kayıt ve kampüs hayatı hakkında sor', 'pro', 10),
  ('making-friends',     'social',    '👋', 'Making Friends',           'Arkadaş Edinme',        'Start conversations and build new connections',    'Sohbet başlat ve yeni bağlantılar kur',        'pro', 11),
  ('phone-call',         'daily',     '📞', 'Phone Call',               'Telefon Görüşmesi',     'Handle a formal or informal phone call',           'Resmi veya samimi bir telefon görüşmesi yap',  'pro', 12),
  ('work-presentation',  'work',      '🎤', 'Work Presentation',        'İş Sunumu',             'Present your ideas clearly and handle Q&A',       'Fikirlerini net sun ve soruları yanıtla',       'pro', 13),
  ('negotiating',        'work',      '🤝', 'Negotiating a Deal',       'Anlaşma Müzakeresi',    'Negotiate prices, terms, or contracts',            'Fiyat, şart veya sözleşme müzakere et',        'pro', 14),
  ('bank-visit',         'daily',     '🏦', 'Bank Visit',               'Banka Ziyareti',        'Open an account and ask about services',           'Hesap aç, hizmetler hakkında sor',             'pro', 15),
  ('emergency',          'daily',     '🚨', 'Emergency Situation',      'Acil Durum',            'Handle urgent situations clearly and calmly',      'Acil durumları net ve sakin yönet',            'pro', 16),
  ('taxi-ride',          'travel',    '🚕', 'Taxi Ride',                'Taksi Yolculuğu',       'Give directions, make small talk, pay',            'Yön ver, sohbet et, öde',                      'pro', 17),
  ('classroom',          'education', '📚', 'Classroom Discussion',     'Sınıf Tartışması',      'Participate in class, ask and answer questions',   'Derse katıl, soru sor ve yanıtla',             'pro', 18),
  ('party',              'social',    '🎉', 'Party Conversation',       'Parti Sohbeti',         'Mingle and make small talk at a social event',     'Sosyal etkinlikte sohbet et',                  'pro', 19),
  ('talking-sports',     'social',    '⚽', 'Talking About Sports',     'Spor Hakkında Konuşma', 'Discuss your favorite sport, team, and matches',   'Favori spor, takım ve maçları konuş',          'pro', 20);
```

- [ ] **Step 3: Create 006_daily_usage.sql**

```sql
create table if not exists public.daily_usage (
  user_id       uuid not null references auth.users on delete cascade,
  date          date not null default current_date,
  session_count int not null default 0,
  voice_seconds int not null default 0,
  primary key (user_id, date)
);

alter table public.daily_usage enable row level security;
create policy "users own their usage" on public.daily_usage
  for all using (auth.uid() = user_id);
```

- [ ] **Step 4: Run migrations**

Paste each migration file into Supabase Dashboard → SQL Editor and run in order: 004 → 005 → 006.

Verify in Table Editor:
- `profiles` has: native_language, practice_language, stripe_customer_id, stripe_subscription_id, subscription_status, current_period_end
- `scenarios` table has 20 rows
- `daily_usage` table exists (empty)

- [ ] **Step 5: Commit**
```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
git add supabase/migrations/
git commit -m "feat: db migrations — stripe, scenarios, daily_usage, language fields"
```

---

### Task 2: Shared Utilities

**Files:**
- Create: `lib/languages.ts`
- Create: `lib/plan.ts`

- [ ] **Step 1: Create lib/languages.ts**

```ts
export interface LanguageOption {
  code: string
  name: string
  flag: string
  available: boolean
}

export const NATIVE_LANGUAGES: LanguageOption[] = [
  { code: 'tr', name: 'Türkçe',    flag: '🇹🇷', available: true },
  { code: 'ar', name: 'العربية',   flag: '🇸🇦', available: true },
  { code: 'es', name: 'Español',   flag: '🇪🇸', available: true },
  { code: 'fr', name: 'Français',  flag: '🇫🇷', available: true },
  { code: 'de', name: 'Deutsch',   flag: '🇩🇪', available: true },
  { code: 'it', name: 'Italiano',  flag: '🇮🇹', available: true },
  { code: 'pt', name: 'Português', flag: '🇵🇹', available: true },
  { code: 'ru', name: 'Русский',   flag: '🇷🇺', available: true },
  { code: 'zh', name: '中文',       flag: '🇨🇳', available: true },
  { code: 'ja', name: '日本語',     flag: '🇯🇵', available: true },
  { code: 'ko', name: '한국어',     flag: '🇰🇷', available: true },
]

export const PRACTICE_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English',  flag: '🇬🇧', available: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'Deutsch',  flag: '🇩🇪', available: false },
  { code: 'es', name: 'Español',  flag: '🇪🇸', available: false },
]
```

- [ ] **Step 2: Create lib/plan.ts**

```ts
export type Plan = 'free' | 'pro' | 'premium'

export interface PlanLimits {
  sessionsPerDay: number        // Infinity = unlimited
  sessionMinutes: number        // Infinity = unlimited
  voiceMinutesPerDay: number    // Infinity = unlimited
  allowedCharacters: string[] | 'all'
  hasAnalysis: boolean
  hasProgressCharts: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    sessionsPerDay: 3,
    sessionMinutes: 5,
    voiceMinutesPerDay: 10,
    allowedCharacters: ['emma', 'leo'],
    hasAnalysis: false,
    hasProgressCharts: false,
  },
  pro: {
    sessionsPerDay: 10,
    sessionMinutes: 20,
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    hasAnalysis: true,
    hasProgressCharts: false,
  },
  premium: {
    sessionsPerDay: Infinity,
    sessionMinutes: Infinity,
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    hasAnalysis: true,
    hasProgressCharts: true,
  },
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === 'pro') return PLAN_LIMITS.pro
  if (plan === 'premium') return PLAN_LIMITS.premium
  return PLAN_LIMITS.free
}

export function canUseCharacter(plan: string | null | undefined, characterId: string): boolean {
  const limits = getPlanLimits(plan)
  if (limits.allowedCharacters === 'all') return true
  return limits.allowedCharacters.includes(characterId)
}

// Estimates TTS audio duration from text: ~150 wpm = 2.5 words/sec
export function estimateVoiceSeconds(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 2.5)
}
```

- [ ] **Step 3: Type-check**
```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**
```bash
git add lib/languages.ts lib/plan.ts
git commit -m "feat: languages and plan limits utilities"
```

---

### Task 3: Onboarding Redesign

**Files:**
- Modify: `app/onboarding/page.tsx` (full rewrite)
- Modify: `app/api/onboarding/route.ts`

- [ ] **Step 1: Update onboarding API**

Replace `app/api/onboarding/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { native_language, practice_language, level, goal } = body;

  const update: Record<string, string> = {};
  if (native_language)  update.native_language  = native_language;
  if (practice_language) update.practice_language = practice_language;
  if (level) update.level = level;
  if (goal)  update.goal  = goal;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Rewrite onboarding page**

Replace `app/onboarding/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NATIVE_LANGUAGES, PRACTICE_LANGUAGES } from "@/lib/languages";

type Step = "native" | "practice" | "level" | "goal";
const STEPS: Step[] = ["native", "practice", "level", "goal"];

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const GOALS  = ["travel", "work", "casual", "exam"] as const;
const LEVEL_LABELS: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const GOAL_LABELS:  Record<string, string> = { travel: "✈️ Travel", work: "💼 Work", casual: "💬 Casual", exam: "📚 Exam" };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("native");
  const [nativeLang, setNativeLang]     = useState("");
  const [practiceLang, setPracticeLang] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const stepIndex = STEPS.indexOf(step);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ native_language: nativeLang, practice_language: practiceLang, level, goal }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/dashboard");
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="ola-gradient-bg relative min-h-screen flex items-center justify-center p-4">
      <div className="ola-wave" />
      <div className="relative z-10 w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to OLA</h1>
          <p className="text-white/60 text-sm">Quick setup — takes 30 seconds</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${i <= stepIndex ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8">

          {step === "native" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">What's your native language?</h2>
              <p className="text-white/50 text-sm mb-6">We'll use this for explanations and corrections</p>
              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {NATIVE_LANGUAGES.map((lang) => (
                  <button key={lang.code}
                    onClick={() => { setNativeLang(lang.code); setStep("practice"); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      nativeLang === lang.code ? "bg-white/20 border-white/60" : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-sm font-medium text-white">{lang.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === "practice" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Which language do you want to practice?</h2>
              <p className="text-white/50 text-sm mb-6">The app will immerse you in this language</p>
              <div className="flex flex-col gap-3">
                {PRACTICE_LANGUAGES.map((lang) => (
                  <button key={lang.code}
                    disabled={!lang.available}
                    onClick={() => { if (lang.available) { setPracticeLang(lang.code); setStep("level"); } }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-xl border text-left transition-all ${
                      !lang.available ? "opacity-40 cursor-not-allowed bg-white/5 border-white/10"
                      : practiceLang === lang.code ? "bg-white/20 border-white/60"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <div>
                      <div className="text-sm font-medium text-white">{lang.name}</div>
                      {!lang.available && <div className="text-xs text-white/40">Coming soon</div>}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("native")} className="mt-4 text-white/40 text-xs hover:text-white/60">← Back</button>
            </>
          )}

          {step === "level" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">What's your current level?</h2>
              <p className="text-white/50 text-sm mb-6">We'll adapt the difficulty for you</p>
              <div className="flex flex-col gap-3">
                {LEVELS.map((l) => (
                  <button key={l}
                    onClick={() => { setLevel(l); setStep("goal"); }}
                    className={`px-5 py-4 rounded-xl border text-left transition-all ${
                      level === l ? "bg-white/20 border-white/60" : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{LEVEL_LABELS[l]}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep("practice")} className="mt-4 text-white/40 text-xs hover:text-white/60">← Back</button>
            </>
          )}

          {step === "goal" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">What's your main goal?</h2>
              <p className="text-white/50 text-sm mb-6">This helps us pick the best scenarios</p>
              <div className="grid grid-cols-2 gap-3">
                {GOALS.map((g) => (
                  <button key={g}
                    onClick={() => setGoal(g)}
                    className={`px-4 py-4 rounded-xl border text-center transition-all ${
                      goal === g ? "bg-white/20 border-white/60" : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{GOAL_LABELS[g]}</span>
                  </button>
                ))}
              </div>
              {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
              <button
                onClick={save}
                disabled={!goal || saving}
                className="mt-6 w-full bg-white text-gray-900 font-semibold py-3 rounded-xl disabled:opacity-50 hover:bg-white/90 transition-colors"
              >
                {saving ? "Saving..." : "Get started →"}
              </button>
              <button onClick={() => setStep("level")} className="mt-3 text-white/40 text-xs hover:text-white/60 block w-full text-center">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add app/onboarding/page.tsx app/api/onboarding/route.ts
git commit -m "feat: onboarding redesign — native + practice language steps"
```

---

### Task 4: Analysis API — Native Language Feedback

**Files:**
- Modify: `app/api/analysis/route.ts`
- Modify: `lib/claude.ts`

Context: Currently `lib/claude.ts` exports a static `ANALYSIS_PROMPT` that always gives feedback in English. We need to make it dynamic based on the user's `native_language`.

- [ ] **Step 1: Add buildAnalysisPrompt to lib/claude.ts**

Open `lib/claude.ts`. Add after the existing `ANALYSIS_PROMPT` constant:

```ts
export function buildAnalysisPrompt(nativeLanguage: string, practiceLanguage: string): string {
  return `You are an expert ${practiceLanguage} language assessor. Review the following conversation between a student and an AI language tutor.
Provide ALL feedback, explanations, tips, and the summary in ${nativeLanguage} (the student's native language).
Only the JSON keys stay in English. All values that are strings visible to the user must be in ${nativeLanguage}.

Evaluate:
1. Grammar accuracy (score 0-100)
2. Vocabulary range (score 0-100)
3. Fluency/coherence (score 0-100)
4. Specific grammar mistakes found
5. Vocabulary suggestions (better word choices)
6. 3 actionable improvement tips

Return ONLY valid JSON in this exact structure:
{
  "grammar_score": number,
  "vocabulary_score": number,
  "fluency_score": number,
  "overall_score": number,
  "grammar_errors": [{"original": string, "corrected": string, "explanation": string}],
  "vocabulary_suggestions": [{"word": string, "alternatives": string[], "context": string}],
  "tips": [string, string, string],
  "summary": string
}`
}
```

- [ ] **Step 2: Update analysis route to use native_language**

Replace `app/api/analysis/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildAnalysisPrompt } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages, sessionId } = await req.json();

    const userId = await getUserIdFromRequest(req);

    // Fetch native + practice language for this user
    let nativeLang = "English";
    let practiceLang = "English";
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("native_language, practice_language, plan")
        .eq("id", userId)
        .single();

      // Map language codes to readable names for the prompt
      const langNames: Record<string, string> = {
        tr: "Turkish", ar: "Arabic", es: "Spanish", fr: "French",
        de: "German", it: "Italian", pt: "Portuguese", ru: "Russian",
        zh: "Chinese", ja: "Japanese", ko: "Korean", en: "English",
      };
      nativeLang  = langNames[profile?.native_language  ?? "en"] ?? "English";
      practiceLang = langNames[profile?.practice_language ?? "en"] ?? "English";
    }

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: buildAnalysisPrompt(nativeLang, practiceLang),
      messages: [{ role: "user", content: `Analyze this conversation:\n\n${conversationText}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    if (userId && sessionId) {
      await supabaseAdmin.from("analysis_results").insert({
        session_id: sessionId,
        grammar_score: analysis.grammar_score ?? null,
        vocabulary_score: analysis.vocabulary_score ?? null,
        fluency_score: analysis.fluency_score ?? null,
        feedback: analysis,
      });

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

- [ ] **Step 3: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add lib/claude.ts app/api/analysis/route.ts
git commit -m "feat: analysis feedback in user's native language"
```

---

### Task 5: Stripe Setup

**Files:**
- Create: `lib/stripe.ts`

- [ ] **Step 1: Create Stripe products in Dashboard**

In Stripe Dashboard (https://dashboard.stripe.com):
1. Products → Create product "OlaLabs Pro" → Add price: $9.00, recurring, monthly → copy the `price_...` ID
2. Products → Create product "OlaLabs Premium" → Add price: $19.00, recurring, monthly → copy the `price_...` ID
3. Settings → Billing → Customer Portal → Enable (keep defaults)

- [ ] **Step 2: Add env vars to .env.local**

Open `.env.local` and add:
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```
(Use `sk_test_` / `pk_test_` for local development.)

- [ ] **Step 3: Create lib/stripe.ts**

```ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const STRIPE_PRICE_IDS: Record<"pro" | "premium", string> = {
  pro:     process.env.STRIPE_PRO_PRICE_ID!,
  premium: process.env.STRIPE_PREMIUM_PRICE_ID!,
};

export function planFromPriceId(priceId: string): "pro" | "premium" | null {
  if (priceId === process.env.STRIPE_PRO_PRICE_ID)     return "pro";
  if (priceId === process.env.STRIPE_PREMIUM_PRICE_ID) return "premium";
  return null;
}
```

- [ ] **Step 4: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**
```bash
git add lib/stripe.ts
git commit -m "feat: stripe client and price ID helpers"
```

---

### Task 6: Stripe Checkout + Portal APIs

**Files:**
- Create: `app/api/stripe/checkout/route.ts`
- Create: `app/api/stripe/portal/route.ts`

- [ ] **Step 1: Create checkout route**

Create `app/api/stripe/checkout/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json() as { plan: "pro" | "premium" };
  if (!STRIPE_PRICE_IDS[plan]) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile?.email ?? user.email ?? "" });
    customerId = customer.id;
    await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const origin = req.headers.get("origin") ?? "https://olalabs.io";
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
    mode: "subscription",
    success_url: `${origin}/dashboard?upgrade=success`,
    cancel_url:  `${origin}/dashboard`,
    metadata: { userId: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 2: Create portal route**

Create `app/api/stripe/portal/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (!customerId) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

  const origin = req.headers.get("origin") ?? "https://olalabs.io";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
```

- [ ] **Step 3: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add app/api/stripe/
git commit -m "feat: stripe checkout and billing portal endpoints"
```

---

### Task 7: Stripe Webhook

**Files:**
- Create: `app/api/stripe/webhook/route.ts`

Note: `proxy.ts` already excludes `/api/` from its route matcher so this endpoint is publicly accessible without an auth cookie.

- [ ] **Step 1: Create webhook route**

Create `app/api/stripe/webhook/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe, planFromPriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "No signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.userId;
        const plan   = session.metadata?.plan;
        if (!userId || !plan) break;
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        await supabaseAdmin.from("profiles").update({
          plan,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq("id", userId);
        break;
      }
      case "customer.subscription.updated": {
        const sub     = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const plan    = planFromPriceId(priceId) ?? "free";
        const { data: profile } = await supabaseAdmin
          .from("profiles").select("id").eq("stripe_subscription_id", sub.id).single();
        if (!profile) break;
        await supabaseAdmin.from("profiles").update({
          plan,
          subscription_status: sub.status,
          current_period_end: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
        }).eq("id", (profile as { id: string }).id);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabaseAdmin.from("profiles").update({
          plan: "free",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        }).eq("stripe_subscription_id", sub.id);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId   = (invoice as unknown as { subscription?: string }).subscription;
        if (subId) {
          await supabaseAdmin.from("profiles").update({ subscription_status: "past_due" })
            .eq("stripe_subscription_id", subId);
        }
        break;
      }
    }
  } catch (err) {
    console.error("[webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Register webhook in Stripe Dashboard**

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://olalabs.io/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy signing secret → add to Vercel env as `STRIPE_WEBHOOK_SECRET`

For local testing:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

- [ ] **Step 3: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add app/api/stripe/webhook/route.ts
git commit -m "feat: stripe webhook handler"
```

---

### Task 8: UpgradeModal + CheckoutButton Components

**Files:**
- Create: `components/UpgradeModal.tsx`
- Create: `components/CheckoutButton.tsx`

- [ ] **Step 1: Create CheckoutButton**

Create `components/CheckoutButton.tsx`:

```tsx
"use client";
import { useState } from "react";

interface Props {
  plan: "pro" | "premium";
  label: string;
  className?: string;
}

export default function CheckoutButton({ plan, label, className = "" }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleClick} disabled={loading}
      className={`disabled:opacity-60 transition-colors ${className}`}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}
```

- [ ] **Step 2: Create UpgradeModal**

Create `components/UpgradeModal.tsx`:

```tsx
"use client";
import { useState } from "react";
import { X, Zap, Star } from "lucide-react";

export type UpgradeReason =
  | "session_limit" | "voice_limit" | "session_time"
  | "locked_character" | "locked_scenario" | "analysis";

const COPY: Record<UpgradeReason, { title: string; subtitle: string }> = {
  session_limit:    { title: "Daily session limit reached",  subtitle: "You've used your 3 free sessions today. Upgrade to keep practicing." },
  voice_limit:      { title: "Daily voice limit reached",    subtitle: "You've used your 10 minutes of free voice practice. Upgrade for unlimited voice." },
  session_time:     { title: "Session time limit reached",   subtitle: "Free sessions are 5 minutes. Upgrade to Pro for 20-minute sessions." },
  locked_character: { title: "Character locked",            subtitle: "This character is available on Pro and above." },
  locked_scenario:  { title: "Scenario locked",             subtitle: "This scenario is available on Pro and above." },
  analysis:         { title: "Analysis is a Pro feature",    subtitle: "Get detailed feedback on grammar, vocabulary, and fluency." },
};

export default function UpgradeModal({ reason, onClose }: { reason: UpgradeReason; onClose: () => void }) {
  const [loading, setLoading] = useState<"pro" | "premium" | null>(null);
  const { title, subtitle } = COPY[reason];

  async function upgrade(plan: "pro" | "premium") {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1f3a] border border-white/20 rounded-2xl p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl mb-2">{title}</h2>
          <p className="text-white/60 text-sm">{subtitle}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => upgrade("pro")} disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-60">
            <div className="text-left">
              <div className="text-white font-semibold flex items-center gap-2"><Zap size={16} /> Pro</div>
              <div className="text-indigo-200 text-xs">10 sessions/day · 20 min each · All characters</div>
            </div>
            <div className="text-white font-bold">$9<span className="text-indigo-300 text-xs font-normal">/mo</span></div>
          </button>
          <button onClick={() => upgrade("premium")} disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 rounded-xl transition-colors disabled:opacity-60">
            <div className="text-left">
              <div className="text-amber-400 font-semibold flex items-center gap-2"><Star size={16} /> Premium</div>
              <div className="text-amber-200/60 text-xs">Unlimited everything · Progress charts</div>
            </div>
            <div className="text-amber-400 font-bold">$19<span className="text-amber-400/60 text-xs font-normal">/mo</span></div>
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full text-white/30 text-xs hover:text-white/50 py-2">Maybe later</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**
```bash
git add components/UpgradeModal.tsx components/CheckoutButton.tsx
git commit -m "feat: UpgradeModal and CheckoutButton components"
```

---

### Task 9: Plan Enforcement — Chat + TTS APIs

**Files:**
- Modify: `app/api/chat/route.ts`
- Modify: `app/api/tts/route.ts`
- Modify: `app/api/auth/me/route.ts`

Context: Session creation happens in `app/api/chat/route.ts` (when `isInitial: true`). TTS route currently has no auth. `/api/auth/me` returns only `{ loggedIn }` — needs to return plan info for the frontend timer.

- [ ] **Step 1: Update /api/auth/me to return plan**

Replace `app/api/auth/me/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ loggedIn: false });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ loggedIn: false });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, native_language, practice_language")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    loggedIn: true,
    plan: profile?.plan ?? "free",
    nativeLanguage: profile?.native_language ?? "tr",
    practiceLanguage: profile?.practice_language ?? "en",
  });
}
```

- [ ] **Step 2: Add session limit check to chat route (isInitial branch)**

Open `app/api/chat/route.ts`. Add these imports at the top:
```ts
import { getPlanLimits } from "@/lib/plan";
```

In the `if (isInitial)` branch, after `const userId = await getUserIdFromRequest(req);`, add the session limit check before creating the session:

```ts
// Session limit enforcement for free/pro users
if (userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();

  const userPlan = (profile as { plan?: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(userPlan);

  if (limits.sessionsPerDay !== Infinity) {
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabaseAdmin
      .from("daily_usage")
      .select("session_count")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    const count = (usage as { session_count?: number } | null)?.session_count ?? 0;
    if (count >= limits.sessionsPerDay) {
      return NextResponse.json({ error: "SESSION_LIMIT" }, { status: 403 });
    }

    await supabaseAdmin.from("daily_usage").upsert(
      { user_id: userId, date: today, session_count: count + 1 },
      { onConflict: "user_id,date" }
    );
  }

  // Character access check
  if (!canUseCharacter(userPlan, characterId)) {
    return NextResponse.json({ error: "CHARACTER_LOCKED" }, { status: 403 });
  }
}
```

Also add `canUseCharacter` to the import:
```ts
import { getPlanLimits, canUseCharacter } from "@/lib/plan";
```

- [ ] **Step 3: Add voice limit check to TTS route**

Open `app/api/tts/route.ts`. Add imports after existing imports:
```ts
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlanLimits, estimateVoiceSeconds } from "@/lib/plan";
```

In the `POST` handler, after `const { text, characterId } = await req.json();`, add:

```ts
// Voice limit enforcement
const userId = await getUserIdFromRequest(req);
if (userId) {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single();
  const userPlan = (profile as { plan?: string } | null)?.plan ?? "free";
  const limits = getPlanLimits(userPlan);

  if (limits.voiceMinutesPerDay !== Infinity) {
    const maxSeconds = limits.voiceMinutesPerDay * 60;
    const today = new Date().toISOString().split("T")[0];
    const { data: usage } = await supabaseAdmin
      .from("daily_usage")
      .select("voice_seconds")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    const used = (usage as { voice_seconds?: number } | null)?.voice_seconds ?? 0;
    if (used >= maxSeconds) {
      return NextResponse.json({ error: "VOICE_LIMIT" }, { status: 403 });
    }

    const estimated = estimateVoiceSeconds(text);
    await supabaseAdmin.from("daily_usage").upsert(
      { user_id: userId, date: today, voice_seconds: Math.min(used + estimated, maxSeconds) },
      { onConflict: "user_id,date" }
    );
  }
}
```

- [ ] **Step 4: Type-check**
```bash
npx tsc --noEmit
```

- [ ] **Step 5: Add session timer + upgrade triggers to practice page**

Open `app/practice/page.tsx`. Add these imports:
```ts
import UpgradeModal, { type UpgradeReason } from "@/components/UpgradeModal";
import { getPlanLimits } from "@/lib/plan";
```

Add state variables (with the other `useState` calls):
```ts
const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);
const [sessionMinutes, setSessionMinutes] = useState<number>(5);
```

In the existing auth-check `useEffect` (the one that calls `/api/auth/me`), extend it to also set sessionMinutes:
```ts
const me = await res.json();
setIsLoggedIn(!!me.loggedIn);
const limits = getPlanLimits(me.plan);
setSessionMinutes(limits.sessionMinutes);
```

Add a timer effect after the existing useEffects:
```ts
useEffect(() => {
  if (!initialized || sessionMinutes === Infinity) return;
  const deadline = Date.now() + sessionMinutes * 60 * 1000;
  const id = setInterval(() => {
    if (Date.now() >= deadline) {
      clearInterval(id);
      setUpgradeReason("session_time");
    }
  }, 15_000);
  return () => clearInterval(id);
}, [initialized, sessionMinutes]);
```

In the TTS fetch section, handle `VOICE_LIMIT` error. Find the existing TTS fetch (look for `/api/tts`) and add after the response check:
```ts
if (!ttsRes.ok) {
  if (ttsRes.status === 403) {
    const err = await ttsRes.json().catch(() => ({}));
    if (err.error === "VOICE_LIMIT") { setUpgradeReason("voice_limit"); return; }
  }
  return;
}
```

Handle `SESSION_LIMIT` in the initial greeting fetch (look for `isInitial: true` fetch):
```ts
if (!res.ok) {
  const err = await res.json().catch(() => ({}));
  if (err.error === "SESSION_LIMIT") { setUpgradeReason("session_limit"); return; }
  if (err.error === "CHARACTER_LOCKED") { setUpgradeReason("locked_character"); return; }
  // existing error handling...
}
```

At the bottom of the JSX return (before the final closing `</div>`), add:
```tsx
{upgradeReason && (
  <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason(null)} />
)}
```

- [ ] **Step 6: Type-check + build**
```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 7: Commit**
```bash
git add app/api/chat/route.ts app/api/tts/route.ts app/api/auth/me/route.ts app/practice/page.tsx
git commit -m "feat: plan enforcement — session limit, voice limit, session timer, character lock"
```

---

### Task 10: Scenarios API + ScenarioSelector

**Files:**
- Create: `app/api/scenarios/route.ts`
- Create: `components/ScenarioSelector.tsx`
- Modify: `app/practice/page.tsx`

- [ ] **Step 1: Create scenarios API**

Create `app/api/scenarios/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  let plan = "free";
  let practiceLang = "en";

  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan, practice_language")
        .eq("id", user.id)
        .single();
      plan = (profile as { plan?: string } | null)?.plan ?? "free";
      practiceLang = (profile as { practice_language?: string } | null)?.practice_language ?? "en";
    }
  }

  const { data: scenarios, error } = await supabaseAdmin
    .from("scenarios")
    .select("slug, category, icon, title_en, title_tr, description_en, description_tr, min_plan, sort_order")
    .eq("practice_language", practiceLang)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userRank = PLAN_RANK[plan] ?? 0;
  const result = (scenarios ?? []).map((s: { min_plan: string; [key: string]: unknown }) => ({
    ...s,
    locked: (PLAN_RANK[s.min_plan] ?? 0) > userRank,
  }));

  return NextResponse.json({ scenarios: result });
}
```

- [ ] **Step 2: Create ScenarioSelector component**

Create `components/ScenarioSelector.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

interface Scenario {
  slug: string;
  category: string;
  icon: string;
  title_en: string;
  description_en: string;
  min_plan: string;
  locked: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel", work: "Work", daily: "Daily Life",
  education: "Education", social: "Social",
};

export default function ScenarioSelector({ onSelect }: { onSelect: (text: string) => void }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((d) => { setScenarios(d.scenarios ?? []); setLoading(false); });
  }, []);

  const categories = [...new Set(scenarios.map((s) => s.category))];

  if (loading) return <div className="text-white/40 text-sm text-center py-8">Loading scenarios...</div>;

  if (showCustom) return (
    <div className="space-y-4">
      <button onClick={() => setShowCustom(false)} className="text-white/40 text-sm hover:text-white/60">← Back to scenarios</button>
      <label className="block text-white/80 text-sm font-medium">Describe your scenario</label>
      <textarea
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        placeholder={`e.g. "I'm going for a US visa interview" or "I want to order food at a café"`}
        rows={3}
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm resize-none"
        autoFocus
      />
      <button
        onClick={() => onSelect(customText.trim())}
        disabled={!customText.trim()}
        className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-white/90 transition-colors text-sm"
      >
        Start practicing →
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {showUpgrade && <UpgradeModal reason="locked_scenario" onClose={() => setShowUpgrade(false)} />}

      {categories.map((cat) => (
        <div key={cat}>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          <div className="flex flex-col gap-2">
            {scenarios.filter((s) => s.category === cat).map((s) => (
              <button key={s.slug}
                onClick={() => s.locked ? setShowUpgrade(true) : onSelect(`${s.title_en}: ${s.description_en}`)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                  s.locked
                    ? "border-white/5 bg-white/3 opacity-50"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{s.title_en}</div>
                  <div className="text-white/40 text-xs truncate">{s.description_en}</div>
                </div>
                {s.locked && <Lock size={14} className="text-white/30 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowCustom(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-all text-sm"
      >
        <span className="text-lg">✏️</span>
        <span>Custom scenario...</span>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Replace free-text with ScenarioSelector in practice page**

Open `app/practice/page.tsx`. Add import:
```ts
import ScenarioSelector from "@/components/ScenarioSelector";
```

Find the `!scenarioSet` render block. It currently has a `<textarea>` for the scenario and a start button. Replace that entire textarea + button section with:

```tsx
<ScenarioSelector
  onSelect={(text) => {
    setScenario(text);
    setScenarioSet(true);
  }}
/>
```

Keep the outer wrapper div, character display, and heading. Only the textarea + button are replaced.

- [ ] **Step 4: Type-check + build**
```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 5: Commit**
```bash
git add app/api/scenarios/route.ts components/ScenarioSelector.tsx app/practice/page.tsx
git commit -m "feat: scenario card system with plan gates"
```

---

### Task 11: Dashboard — Lock Free-Only Characters

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add character locking to dashboard**

Open `app/dashboard/page.tsx`. Add import:
```ts
import { canUseCharacter } from "@/lib/plan";
import UpgradeModal, { type UpgradeReason } from "@/components/UpgradeModal";
```

The dashboard is a Server Component. `getUserData()` already fetches `plan`. Pass it through to the JSX.

Since `UpgradeModal` is a Client Component, extract the lock overlay + modal to a small client wrapper. Create `components/CharacterCard.tsx`:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";
import CharacterAvatar from "@/components/CharacterAvatar";
import type { Character } from "@/lib/characters";

interface Props {
  character: Character;
  locked: boolean;
  label: string; // "Start" button text
}

export default function CharacterCard({ character, locked, label }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  return (
    <div className="relative">
      {showUpgrade && <UpgradeModal reason="locked_character" onClose={() => setShowUpgrade(false)} />}
      <div className={`relative ${locked ? "opacity-60" : ""}`}>
        <CharacterAvatar character={character} />
        {locked && (
          <div className="absolute inset-0 rounded-[inherit] flex items-end justify-center pb-4">
            <div className="flex items-center gap-1 bg-black/60 px-3 py-1 rounded-full text-xs text-white/70">
              <Lock size={10} /> Pro
            </div>
          </div>
        )}
        {locked ? (
          <button
            onClick={() => setShowUpgrade(true)}
            className="mt-2 w-full text-center text-sm text-white/50"
          >
            {label}
          </button>
        ) : (
          <Link href={`/practice?character=${character.id}`} className="mt-2 block text-center text-sm text-white">
            {label}
          </Link>
        )}
      </div>
    </div>
  );
}
```

Then in `app/dashboard/page.tsx`, replace direct character card renders with `<CharacterCard character={c} locked={!canUseCharacter(userData?.plan, c.id)} label={Td.start} />`.

- [ ] **Step 2: Type-check + build**
```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add app/dashboard/page.tsx components/CharacterCard.tsx
git commit -m "feat: lock non-free characters on dashboard"
```

---

### Task 12: Progress Tracking (ActivityCalendar + ScoreTrend)

**Files:**
- Create: `components/ActivityCalendar.tsx`
- Create: `components/ScoreTrend.tsx`
- Modify: `app/profile/page.tsx`

- [ ] **Step 1: Install recharts**
```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
npm install recharts
```

- [ ] **Step 2: Create ActivityCalendar**

Create `components/ActivityCalendar.tsx`:

```tsx
"use client";

interface DayData { date: string; minutes: number }

function intensity(m: number) {
  if (m === 0)   return "bg-white/5";
  if (m < 10)  return "bg-indigo-900/60";
  if (m < 20)  return "bg-indigo-700/70";
  if (m < 40)  return "bg-indigo-500/80";
  return "bg-indigo-400";
}

export default function ActivityCalendar({ data }: { data: DayData[] }) {
  const map = new Map(data.map((d) => [d.date, d.minutes]));
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (83 - i));
    const key = d.toISOString().split("T")[0];
    return { date: key, minutes: map.get(key) ?? 0 };
  });

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);

  let streak = 0;
  const today = new Date().toISOString().split("T")[0];
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].date > today) continue;
    if (days[i].minutes > 0) streak++; else break;
  }

  const weeks: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/50 text-xs">{totalMinutes} min in last 12 weeks</span>
        {streak > 0 && <span className="text-amber-400 text-sm font-medium">🔥 {streak}-day streak</span>}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div key={day.date} title={`${day.date}: ${day.minutes} min`}
                className={`w-3 h-3 rounded-sm ${intensity(day.minutes)}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create ScoreTrend**

Create `components/ScoreTrend.tsx`:

```tsx
"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DataPoint { date: string; grammar: number | null; vocabulary: number | null; fluency: number | null }

export default function ScoreTrend({ data }: { data: DataPoint[] }) {
  if (data.length < 3) return (
    <div className="flex items-center justify-center h-32 text-white/30 text-sm">
      Complete at least 3 analyzed sessions to see your trend
    </div>
  );

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <XAxis dataKey="label" tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: "#ffffff40", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: "#1a1f3a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#ffffff80", fontSize: 11 }} itemStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11, color: "#ffffff60" }} />
        <Line type="monotone" dataKey="grammar"    stroke="#6366f1" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="vocabulary" stroke="#a855f7" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="fluency"    stroke="#22d3ee" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Update profile page with progress section**

Open `app/profile/page.tsx`. Update `getProfileData()` to also fetch progress data:

```ts
// Add after existing sessions fetch, inside getProfileData():
const { data: allSessions } = await supabaseAdmin
  .from("sessions")
  .select("started_at, ended_at, analysis_results(grammar_score, vocabulary_score, fluency_score)")
  .eq("user_id", user.id)
  .gte("started_at", new Date(Date.now() - 84 * 24 * 60 * 60 * 1000).toISOString())
  .order("started_at");

// Build activity calendar data
const activityMap = new Map<string, number>();
for (const s of allSessions ?? []) {
  const date = (s as { started_at: string; ended_at: string | null }).started_at.split("T")[0];
  const mins = (s as { ended_at: string | null }).ended_at
    ? Math.max(0, Math.round(
        (new Date((s as { ended_at: string }).ended_at).getTime() -
         new Date((s as { started_at: string }).started_at).getTime()) / 60000
      ))
    : 0;
  activityMap.set(date, (activityMap.get(date) ?? 0) + mins);
}
const activityData = [...activityMap.entries()].map(([date, minutes]) => ({ date, minutes }));

// Build score trend (last 30 analyzed sessions)
const scoreTrendData = (allSessions ?? [])
  .filter((s) => {
    const ar = (s as { analysis_results: unknown[] }).analysis_results;
    return Array.isArray(ar) && ar.length > 0;
  })
  .slice(-30)
  .map((s) => {
    const ar = ((s as { analysis_results: Array<{ grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null }> }).analysis_results)[0];
    return {
      date: (s as { started_at: string }).started_at.split("T")[0],
      grammar:    ar?.grammar_score    ?? null,
      vocabulary: ar?.vocabulary_score ?? null,
      fluency:    ar?.fluency_score    ?? null,
    };
  });

// Update return to include new data:
return { profile, sessions: sessions ?? [], activityData, scoreTrendData };
```

Add imports to profile page:
```ts
import ActivityCalendar from "@/components/ActivityCalendar";
import ScoreTrend from "@/components/ScoreTrend";
import { getPlanLimits } from "@/lib/plan";
import CheckoutButton from "@/components/CheckoutButton";
```

At the end of the profile JSX (after sessions list), add:

```tsx
{/* Progress section */}
{getPlanLimits(data.profile?.plan).hasProgressCharts ? (
  <section className="mt-8 space-y-6">
    <h2 className="text-white font-semibold text-lg">Progress</h2>
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-white/60 text-sm font-medium mb-4">Practice Activity</h3>
      <ActivityCalendar data={data.activityData} />
    </div>
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h3 className="text-white/60 text-sm font-medium mb-4">Score Trend</h3>
      <ScoreTrend data={data.scoreTrendData} />
    </div>
  </section>
) : (
  <section className="mt-8">
    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
      <div className="text-3xl mb-3">📈</div>
      <h3 className="text-white font-semibold mb-2">Track your progress</h3>
      <p className="text-white/40 text-sm mb-4">Unlock activity heatmap and score trends with Premium</p>
      <CheckoutButton plan="premium" label="Upgrade to Premium →"
        className="bg-amber-500 hover:bg-amber-400 text-white font-semibold px-6 py-2 rounded-xl text-sm" />
    </div>
  </section>
)}
```

- [ ] **Step 5: Type-check + build**
```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 6: Commit**
```bash
git add components/ActivityCalendar.tsx components/ScoreTrend.tsx app/profile/page.tsx package.json package-lock.json
git commit -m "feat: progress tracking — activity calendar and score trend (Premium)"
```

---

### Task 13: Rebuild Pricing Page

**Files:**
- Modify: `app/pricing/page.tsx`

- [ ] **Step 1: Rewrite pricing page**

Replace `app/pricing/page.tsx`:

```tsx
import Link from "next/link";
import { Check } from "lucide-react";
import CheckoutButton from "@/components/CheckoutButton";

const PLANS = [
  {
    name: "Free", price: "$0", period: "",
    description: "Start for free, no card needed",
    borderClass: "border-white/10",
    features: [
      "3 sessions per day",
      "5 minutes per session",
      "10 minutes voice practice/day",
      "2 AI characters (Emma & Leo)",
      "3 practice scenarios",
    ],
    ctaType: "link" as const,
    ctaHref: "/register",
    ctaLabel: "Get started",
    ctaClass: "bg-white/10 hover:bg-white/20 text-white",
  },
  {
    name: "Pro", price: "$9", period: "/month",
    description: "For daily learners — 1-2 hours a day",
    borderClass: "border-indigo-500/50",
    badge: "Most Popular",
    features: [
      "10 sessions per day",
      "20 minutes per session",
      "Unlimited voice practice",
      "All 6+ AI characters",
      "All practice scenarios",
      "Session analysis & feedback",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "pro" as const,
    ctaLabel: "Start Pro",
    ctaClass: "bg-indigo-600 hover:bg-indigo-500 text-white",
  },
  {
    name: "Premium", price: "$19", period: "/month",
    description: "For serious learners — no limits",
    borderClass: "border-amber-500/30",
    features: [
      "Unlimited sessions & length",
      "Unlimited voice practice",
      "All characters & scenarios",
      "Detailed analysis & feedback",
      "Progress charts & streaks",
      "Custom scenarios (coming soon)",
    ],
    ctaType: "checkout" as const,
    ctaPlan: "premium" as const,
    ctaLabel: "Start Premium",
    ctaClass: "bg-amber-500 hover:bg-amber-400 text-white",
  },
] as const;

export default function PricingPage() {
  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight block mb-8">OLA</Link>
          <h1 className="text-4xl font-bold text-white mb-3">Simple pricing</h1>
          <p className="text-white/50">Start free. Upgrade when you're ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`relative bg-white/5 border ${plan.borderClass} rounded-2xl p-8`}>
              {"badge" in plan && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <div className="text-white/50 text-sm font-semibold uppercase tracking-wider mb-1">{plan.name}</div>
                <div className="text-4xl font-bold text-white">
                  {plan.price}<span className="text-base font-normal text-white/40">{plan.period}</span>
                </div>
                <div className="text-white/40 text-sm mt-1">{plan.description}</div>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                    <Check size={14} className="text-green-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              {plan.ctaType === "link" ? (
                <Link href={plan.ctaHref}
                  className={`block w-full text-center py-3 rounded-xl font-semibold text-sm transition-colors ${plan.ctaClass}`}>
                  {plan.ctaLabel}
                </Link>
              ) : (
                <CheckoutButton plan={plan.ctaPlan} label={plan.ctaLabel}
                  className={`w-full py-3 rounded-xl font-semibold text-sm ${plan.ctaClass}`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + build**
```bash
npx tsc --noEmit
npm run build
```

- [ ] **Step 3: Commit**
```bash
git add app/pricing/page.tsx
git commit -m "feat: rebuild pricing page with all three plans"
```

---

### Task 14: Deploy + Smoke Test

- [ ] **Step 1: Add all env vars to Vercel**

In Vercel Dashboard → Project → Settings → Environment Variables, add:
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

- [ ] **Step 2: Run migrations on production Supabase**

Paste and run migrations 004 → 005 → 006 in Supabase Dashboard → SQL Editor.

- [ ] **Step 3: Push to deploy**
```bash
git push origin master
```

Watch Vercel dashboard for build completion.

- [ ] **Step 4: Register webhook in Stripe**

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://olalabs.io/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

- [ ] **Step 5: Smoke test**
1. Register new account → onboarding shows 4 steps (native lang → practice lang → level → goal) ✓
2. Dashboard: Emma + Leo unlocked, other characters show Pro lock ✓
3. Start practice → ScenarioSelector shows 3 free + locked others ✓
4. Custom scenario option works ✓
5. Voice practice works (Azure TTS) ✓
6. After 3 sessions, SESSION_LIMIT error → UpgradeModal shows ✓
7. Click "Pro" in modal → Stripe Checkout opens ✓
8. Pay with test card `4242 4242 4242 4242` → redirected to `/dashboard?upgrade=success` ✓
9. All characters and scenarios now unlocked ✓
10. Profile page → progress section blurred with Premium CTA for Pro user ✓
11. After Premium upgrade → ActivityCalendar + ScoreTrend visible ✓
12. Analysis returns feedback in Turkish (for Turkish native language users) ✓

- [ ] **Step 6: Tag release**
```bash
git tag v1.2.0
git push origin v1.2.0
```
