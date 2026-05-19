# OlaLabs v1.2 — Stripe + Scenarios + Progress Tracking

Date: 2026-05-19  
Status: Approved

## Overview

Three features implemented in parallel after a shared DB migration foundation:
1. **Stripe payments** — Free / Pro ($9/mo) / Premium ($19/mo) subscription tiers
2. **Scenario system** — pre-built scenario cards + customize option, plan-gated
3. **Progress tracking** — activity calendar + score trend charts (Premium)

Cross-cutting: **language architecture redesign** — native_language (for explanations) vs practice_language (for practice), English first, extensible.

---

## Plan Limits

| | Free | Pro $9/mo | Premium $19/mo |
|---|---|---|---|
| Sessions/day | 3 | 10 | Unlimited |
| Session duration | 5 min | 20 min | Unlimited |
| Voice (TTS) | 10 min/day | Unlimited | Unlimited |
| Characters | 2 (Emma + Leo) | All | All |
| Scenarios | 3 pre-built | All pre-built | All + custom |
| Analysis | ✗ | ✓ | ✓ |
| Progress charts | ✗ | ✗ | ✓ |

Upgrade prompts fire at: session limit hit, voice limit hit, locked character/scenario tapped, analysis button tapped.

---

## Phase 0 — DB Migrations (foundation for all other phases)

### Migration 004: plan & subscription fields on profiles
```sql
alter table public.profiles
  add column if not exists native_language text default 'tr',   -- replaces old 'language' column
  add column if not exists practice_language text default 'en', -- the language being practiced
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text default null, -- null = free user (no subscription)
  add column if not exists current_period_end timestamptz;
```

### Migration 005: scenarios table
```sql
create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category text not null,          -- 'travel' | 'work' | 'daily' | 'education' | 'social'
  icon text not null,              -- emoji
  title_en text not null,
  title_tr text not null,
  description_en text not null,
  description_tr text not null,
  practice_language text not null default 'en',
  min_plan text not null default 'free', -- 'free' | 'pro' | 'premium'
  sort_order int not null default 0,
  created_at timestamptz default now()
);
```

Seed data: 20+ scenarios across 5 categories. 3 marked `min_plan = 'free'`, rest `pro`.

### Migration 006: daily_usage table (Free tier limit tracking)
```sql
create table public.daily_usage (
  user_id uuid references auth.users on delete cascade,
  date date not null,
  session_count int default 0,
  voice_seconds int default 0,
  primary key (user_id, date)
);
alter table public.daily_usage enable row level security;
create policy "users own usage" on public.daily_usage
  for all using (auth.uid() = user_id);
```

---

## Phase 1A — Stripe Integration (parallel with 1B)

### Files created/modified
- `lib/stripe.ts` — Stripe client singleton
- `lib/plan.ts` — plan limits + enforcement helpers
- `app/api/stripe/checkout/route.ts` — create Checkout session
- `app/api/stripe/portal/route.ts` — create Billing Portal session
- `app/api/stripe/webhook/route.ts` — handle Stripe events
- `components/UpgradeModal.tsx` — shown at limit hits
- `app/pricing/page.tsx` — public pricing page (rebuild)

### lib/plan.ts — central limits
```ts
export const PLAN_LIMITS = {
  free:    { sessionsPerDay: 3, sessionMinutes: 5,  voiceMinutesPerDay: 10, characters: ['emma','leo'], scenarioSlots: 3 },
  pro:     { sessionsPerDay: 10, sessionMinutes: 20, voiceMinutesPerDay: Infinity, characters: 'all', scenarioSlots: Infinity },
  premium: { sessionsPerDay: Infinity, sessionMinutes: Infinity, voiceMinutesPerDay: Infinity, characters: 'all', scenarioSlots: Infinity },
}

export function canStartSession(plan, todayCount): { allowed: boolean; code?: string }
export function canUseVoice(plan, todayVoiceSeconds): { allowed: boolean; secondsLeft?: number }
export function hasAnalysis(plan): boolean
export function hasProgressCharts(plan): boolean
```

### Webhook events handled
- `checkout.session.completed` → activate plan
- `customer.subscription.updated` → sync plan + period_end
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → set subscription_status = 'past_due'

### Env vars required
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRO_PRICE_ID
STRIPE_PREMIUM_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

---

## Phase 1B — Scenario System (parallel with 1A)

### Files created/modified
- `app/api/scenarios/route.ts` — GET scenarios filtered by plan + practice_language
- `components/ScenarioSelector.tsx` — card grid + customize option
- `app/practice/page.tsx` — replace free-text with ScenarioSelector

### ScenarioSelector UX
1. Cards grouped by category (Travel, Work, Daily Life, Education, Social)
2. Locked cards shown with lock icon + "Pro'ya geç" tooltip for Free users
3. "Özelleştir..." card at end — opens existing free-text textarea
4. Premium: "+ Özel senaryo kaydet" button — out of scope for this spec (v1.3)

### Free tier: 3 unlocked scenarios
- "Visa interview at the embassy"
- "Ordering food at a restaurant"  
- "Asking for directions"

---

## Phase 1C — Language Architecture (parallel with 1A + 1B)

### Onboarding redesign (app/onboarding/page.tsx)
Steps:
1. Native language selection (flags + language names, 10+ options)
2. Practice language selection (English only now, others "coming soon" grayed out)
3. Level selection (existing)
4. Goal selection (existing)

### lib/languages.ts (new)
```ts
export const NATIVE_LANGUAGES = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  // ... extensible
]

export const PRACTICE_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧', available: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', available: false },
  // ... extensible
]
```

### Analysis API update
`app/api/analysis/route.ts` reads `native_language` from profile and instructs Claude to give feedback in that language:

```
System: "Give all feedback and explanations in {nativeLanguage}. The user is practicing {practiceLanguage}."
```

---

## Phase 2 — Progress Tracking (after Phase 1)

### Files created/modified
- `app/profile/page.tsx` — add progress section (Premium gate)
- `components/ActivityCalendar.tsx` — GitHub-style heatmap, last 12 weeks
- `components/ScoreTrend.tsx` — line chart, last 30 days, grammar/vocab/fluency

### Data source
Both components read from existing `sessions` + `analysis_results` tables. No new tables needed.

### ActivityCalendar
- Each cell = 1 day. Color intensity = voice minutes practiced that day.
- Streak counter top-right.
- Tooltip on hover: "3 sessions · 47 min practiced"

### ScoreTrend
- Three lines: grammar (blue), vocabulary (purple), fluency (green)
- X-axis: last 30 days. Y-axis: 0–100.
- Empty state if < 3 sessions with analysis.
- Uses recharts (install if not present: `npm install recharts`).

### Premium gate
Profile page shows blurred placeholder + "Unlock with Premium" CTA if plan !== 'premium'.

---

## Implementation Order

```
Migration 004+005+006  (1 PR, ~30 min)
         ↓
  ┌──────┴──────┐
1A Stripe    1B Scenarios    1C Language arch
  └──────┬──────┘
         ↓
    Phase 2: Progress tracking
```

Phases 1A, 1B, 1C can be built in parallel by separate agents after migrations land.

---

## Out of Scope (this spec)

- Annual pricing / discount codes
- Custom scenario builder UI (Premium — listed as feature, full editor is v1.3)
- Other practice languages beyond English (architecture ready, content not)
- Push notifications / email reminders
