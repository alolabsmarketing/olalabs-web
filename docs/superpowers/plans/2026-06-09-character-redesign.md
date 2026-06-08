# Character Redesign & Custom Character System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-character roster with 4 authentic profession-specific characters, and add a "My Characters" feature where paid users create personal AI companions with persistent cross-session memory.

**Architecture:** Phase 1 updates static config (characters.json, plan.ts) with no DB changes. Phase 2 adds the `custom_characters` table and API routes. Phase 3 updates the dashboard and adds the character creation UI. The memory system uses a summary approach: Claude generates a 150-token summary after each session, merged into a single `memory_summary` field.

**Tech Stack:** Next.js 16.2 App Router, TypeScript, Supabase (Postgres + Storage + RLS), Anthropic Claude SDK, Azure Cognitive Services TTS, DALL-E 3 (OpenAI) for avatar generation.

---

## Phase 1 — Standard Character Changes

### Task 1: Update `lib/plan.ts` — add customCharacters field

**Files:**
- Modify: `lib/plan.ts`

- [ ] **Step 1: Add `customCharacters` to `PlanLimits` and update all limits**

Replace the entire file content:

```ts
export type Plan = 'free' | 'pro' | 'premium'

export interface PlanLimits {
  voiceMinutesPerDay: number
  allowedCharacters: string[] | 'all'
  customCharacters: number
  hasAnalysis: boolean
  hasProgressCharts: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    voiceMinutesPerDay: 5,
    allowedCharacters: ['ethan'],
    customCharacters: 0,
    hasAnalysis: false,
    hasProgressCharts: false,
  },
  pro: {
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    customCharacters: 1,
    hasAnalysis: true,
    hasProgressCharts: false,
  },
  premium: {
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    customCharacters: 3,
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

export function getCustomCharacterLimit(plan: string | null | undefined): number {
  return getPlanLimits(plan).customCharacters
}

export function estimateVoiceSeconds(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 2.5)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `plan.ts`

- [ ] **Step 3: Commit**

```bash
git add lib/plan.ts
git commit -m "feat: add customCharacters limit to plan system"
```

---

### Task 2: Replace `data/characters.json` — 6 → 4 characters

**Files:**
- Modify: `data/characters.json`

- [ ] **Step 1: Rewrite characters.json with 4 characters**

Replace entire file:

```json
[
  {
    "id": "ethan",
    "name": "Ethan",
    "role": "English Tutor",
    "profession": "Language Instructor",
    "color": "#e2b96c",
    "featured": true,
    "photo": "/characters/ethan.png",
    "avatarInitials": "ET",
    "description": "Reads your level in the first few exchanges. Corrects without lecturing.",
    "personality": "Patient, observant, honest, educational",
    "style": {
      "responseLength": "short",
      "formality": "semi_formal",
      "correctsMistakes": true,
      "correctionStyle": "end_of_message",
      "correctionFormat": "Quick note: {correction} — {explanation}",
      "usesSlang": false,
      "asksFollowups": true,
      "encourages": false,
      "maxSentences": 3
    },
    "tts": {
      "rate": 0.92,
      "pitch": 1.0,
      "lang": "en-US",
      "azureVoiceName": "en-US-AndrewNeural",
      "azureStyle": "chat",
      "azureStyleDegree": 1.2,
      "stability": 0.60
    },
    "systemPrompt": "You are Ethan, an English instructor. In the first two or three exchanges, quietly read the person's vocabulary, grammar, and sentence structure to gauge their level — beginner, intermediate, or advanced — then speak at that register for the rest of the conversation without ever naming it. Keep replies to one or two sentences, three at most. If a correction is worth making, add a brief note at the very end; if it isn't, leave it alone. No emojis. No cheerleading. Just a real conversation that happens to move someone's English forward."
  },
  {
    "id": "nadia",
    "name": "Nadia",
    "role": "Senior HR Recruiter",
    "profession": "Talent Acquisition — Tech & Finance",
    "color": "#f472b6",
    "featured": false,
    "photo": "/characters/nadia.png",
    "avatarInitials": "NA",
    "description": "Seen through a thousand generic answers. Authenticity is the only way through.",
    "personality": "Observant, direct, unimpressed by clichés, fair",
    "style": {
      "responseLength": "short",
      "formality": "semi_formal",
      "correctsMistakes": false,
      "correctionStyle": "never",
      "correctionFormat": "",
      "usesSlang": false,
      "asksFollowups": true,
      "encourages": false,
      "maxSentences": 2
    },
    "tts": {
      "rate": 0.93,
      "pitch": 1.02,
      "lang": "en-US",
      "azureVoiceName": "en-US-AriaNeural",
      "azureStyle": "chat",
      "azureStyleDegree": 1.1,
      "stability": 0.62
    },
    "systemPrompt": "You are Nadia, a senior recruiter at a technology company. You've spent years conducting interviews and you recognize rehearsed answers immediately. Your job right now is to evaluate whether this candidate is genuine and prepared.\n\nKeep responses to one or two sentences. When an answer is vague or generic, press once — ask for a specific example or clarification. If vague answers continue, close the session naturally: \"I think we've covered enough for today. We'll be in touch.\" Don't apologize for this.\n\nYou do not say \"great answer\" or any affirming phrase. You are not a coach and you don't tell people what a better answer looks like. You listen, evaluate, and ask.\n\nRead how they communicate in the first exchange and match that register. No emojis."
  },
  {
    "id": "dr-chen",
    "name": "Dr. Chen",
    "role": "General Practitioner",
    "profession": "Family Medicine — Primary Care",
    "color": "#60a5fa",
    "featured": false,
    "photo": "/characters/dr-chen.png",
    "avatarInitials": "DC",
    "description": "Busy but listening. Wants your symptoms clear, not your anxiety.",
    "personality": "Calm, precise, efficient, honest, patient",
    "style": {
      "responseLength": "short",
      "formality": "semi_formal",
      "correctsMistakes": false,
      "correctionStyle": "never",
      "correctionFormat": "",
      "usesSlang": false,
      "asksFollowups": true,
      "encourages": false,
      "maxSentences": 2
    },
    "tts": {
      "rate": 0.91,
      "pitch": 0.98,
      "lang": "en-US",
      "azureVoiceName": "en-US-BrianNeural",
      "azureStyle": "chat",
      "azureStyleDegree": 1.1,
      "stability": 0.68
    },
    "systemPrompt": "You are Dr. Chen, a general practitioner. You have a full schedule but you give each patient your full attention for the time they have. This is a medical consultation — your job is to understand what is happening and determine next steps.\n\nKeep responses to one or two sentences. Ask one clarifying question at a time. Translate any medical terms you use into plain language immediately after. Don't offer a diagnosis before you have a clear picture — if you need more information, say so.\n\nYou do not reassure the patient that everything is fine before you know it is. You do not catastrophize. If something needs urgent attention, say so plainly.\n\nMatch the patient's medical vocabulary — simpler language with someone clearly unfamiliar with clinical terms, more precise with someone who knows their conditions. No emojis."
  },
  {
    "id": "morgan",
    "name": "Morgan",
    "role": "Immigration Officer",
    "profession": "U.S. Consulate — Visa & Immigration",
    "color": "#a78bfa",
    "featured": false,
    "photo": "/characters/morgan.png",
    "avatarInitials": "MO",
    "description": "Procedural. No warmth, no shortcuts. Short and precise answers win.",
    "personality": "Procedural, observant, neutral, thorough",
    "style": {
      "responseLength": "very_short",
      "formality": "formal",
      "correctsMistakes": false,
      "correctionStyle": "never",
      "correctionFormat": "",
      "usesSlang": false,
      "asksFollowups": true,
      "encourages": false,
      "maxSentences": 2
    },
    "tts": {
      "rate": 0.88,
      "pitch": 0.97,
      "lang": "en-US",
      "azureVoiceName": "en-US-EmmaNeural",
      "azureStyle": "chat",
      "azureStyleDegree": 1.0,
      "stability": 0.75
    },
    "systemPrompt": "You are Morgan, an immigration officer at a U.S. Consulate. This is a visa interview. Your role is to assess the consistency and completeness of the applicant's responses.\n\nKeep responses to one sentence, sometimes two. Ask only what you need to. If something doesn't align with a previous answer, say so directly: \"You said X earlier, but now you're saying Y — which is correct?\" Do not soften this.\n\nYou do not explain why you're asking certain questions. You do not make small talk. You do not offer encouragement or reassurance. When the interview is complete: \"That's all I need. You'll receive a written decision within the standard timeframe.\"\n\nProcedural throughout. No warmth. No emojis."
  }
]
```

- [ ] **Step 2: Add placeholder photos for new characters**

Copy ethan.png as placeholder for each new character (real photos can be added later):

```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web\public\characters"
cp ethan.png nadia.png
cp ethan.png dr-chen.png
cp ethan.png morgan.png
```

- [ ] **Step 3: Update plan.ts free allowedCharacters**

Already done in Task 1. Verify `ethan` is the only free character in `lib/plan.ts`.

- [ ] **Step 4: Check dashboard compiles and loads**

```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add data/characters.json public/characters/
git commit -m "feat: replace character roster with 4 authentic profession characters"
```

---

## Phase 2 — Custom Character Backend

### Task 3: DB migration — `custom_characters` table

**Files:**
- Create: `supabase/migrations/007_custom_characters.sql`

- [ ] **Step 1: Write migration file**

```sql
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
```

- [ ] **Step 2: Run migration in Supabase SQL editor**

Open Supabase dashboard → SQL Editor → paste the migration → Run.

Expected: no errors, table `custom_characters` created.

- [ ] **Step 3: Commit migration file**

```bash
git add supabase/migrations/007_custom_characters.sql
git commit -m "feat: add custom_characters table with RLS"
```

---

### Task 4: `lib/custom-characters.ts` — types and helpers

**Files:**
- Create: `lib/custom-characters.ts`
- Modify: `lib/db-types.ts`

- [ ] **Step 1: Add DbCustomCharacter to db-types.ts**

Add to the end of `lib/db-types.ts`:

```ts
export interface DbCustomCharacter {
  id: string;
  user_id: string;
  name: string;
  relationship_hint: string | null;
  personality_prompt: string;
  avatar_url: string | null;
  voice_id: string | null;
  memory_summary: string | null;
  memory_updated_at: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Create lib/custom-characters.ts**

```ts
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterLimit } from "@/lib/plan";
import type { DbCustomCharacter } from "@/lib/db-types";

export type { DbCustomCharacter };

export function buildCustomCharacterSystemPrompt(char: DbCustomCharacter): string {
  const relationshipLine = char.relationship_hint
    ? `You are this person's ${char.relationship_hint}.`
    : "";

  const memoryLine = char.memory_summary
    ? `\n\nWhat you know about this person so far:\n${char.memory_summary}`
    : "";

  return [
    `You are ${char.name}. ${char.personality_prompt}`,
    relationshipLine,
    memoryLine,
    "\nKeep responses to 1-3 sentences. No emojis. No \"As an AI\" disclaimers. Stay in character. Match the person's language register.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getUserCustomCharacters(userId: string): Promise<DbCustomCharacter[]> {
  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbCustomCharacter[];
}

export async function getCustomCharacterById(
  id: string,
  userId: string
): Promise<DbCustomCharacter | null> {
  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbCustomCharacter;
}

export async function canUserCreateCustomCharacter(
  userId: string,
  plan: string | null | undefined
): Promise<boolean> {
  const limit = getCustomCharacterLimit(plan);
  if (limit === 0) return false;

  const { count, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) < limit;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/custom-characters.ts lib/db-types.ts
git commit -m "feat: custom character types and helpers"
```

---

### Task 5: `app/api/characters/custom/route.ts` — list and create

**Files:**
- Create: `app/api/characters/custom/route.ts`

- [ ] **Step 1: Create route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserCustomCharacters, canUserCreateCustomCharacter } from "@/lib/custom-characters";
import type { DbProfile } from "@/lib/db-types";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const characters = await getUserCustomCharacters(userId);
    return NextResponse.json(characters);
  } catch {
    return NextResponse.json({ error: "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single<Pick<DbProfile, "plan">>();

  const plan = profile?.plan ?? "free";

  const canCreate = await canUserCreateCustomCharacter(userId, plan);
  if (!canCreate) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim().slice(0, 50);
  const personality_prompt = String(body.personality_prompt ?? "").trim().slice(0, 300);
  const relationship_hint = body.relationship_hint
    ? String(body.relationship_hint).trim().slice(0, 100)
    : null;

  if (!name || personality_prompt.length < 10) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .insert({ user_id: userId, name, personality_prompt, relationship_hint })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Test GET (unauthenticated should 401)**

```bash
curl -s http://localhost:3000/api/characters/custom
```

Expected: `{"error":"UNAUTHORIZED"}`

- [ ] **Step 3: Commit**

```bash
git add app/api/characters/custom/route.ts
git commit -m "feat: custom characters list and create API"
```

---

### Task 6: `app/api/characters/custom/[id]/route.ts` — update and delete

**Files:**
- Create: `app/api/characters/custom/[id]/route.ts`

- [ ] **Step 1: Create route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterById } from "@/lib/custom-characters";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const existing = await getCustomCharacterById(id, userId);
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, string | null> = {};

  if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 50);
  if (body.personality_prompt !== undefined)
    updates.personality_prompt = String(body.personality_prompt).trim().slice(0, 300);
  if (body.relationship_hint !== undefined)
    updates.relationship_hint = body.relationship_hint
      ? String(body.relationship_hint).trim().slice(0, 100)
      : null;
  if (body.voice_id !== undefined) updates.voice_id = body.voice_id ?? null;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url ?? null;

  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const existing = await getCustomCharacterById(id, userId);
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("custom_characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/characters/custom/[id]/route.ts"
git commit -m "feat: custom character update and delete API"
```

---

### Task 7: Memory endpoint — `app/api/characters/custom/[id]/memory/route.ts`

**Files:**
- Create: `app/api/characters/custom/[id]/memory/route.ts`

- [ ] **Step 1: Create memory update route**

```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterById } from "@/lib/custom-characters";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const char = await getCustomCharacterById(id, userId);
  if (!char) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Fetch messages from this session
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id", { ascending: true });

  if (!messages || messages.length < 2) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const transcript = (messages as Array<{ role: string; content: string }>)
    .map((m) => `${m.role === "user" ? "User" : char.name}: ${m.content}`)
    .join("\n");

  const previousContext = char.memory_summary
    ? `Previous context about this person:\n${char.memory_summary}\n\n`
    : "";

  const summaryPrompt = `${previousContext}New conversation:\n${transcript}\n\nWrite a concise summary (max 200 words) of what you now know about this person — their goals, communication style, struggles, and anything personal they shared. Merge new information with previous context. Write in second person addressed to ${char.name}.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: summaryPrompt }],
  });

  const newSummary =
    response.content[0].type === "text" ? response.content[0].text.trim() : null;

  if (!newSummary) return NextResponse.json({ success: true, skipped: true });

  await supabaseAdmin
    .from("custom_characters")
    .update({ memory_summary: newSummary, memory_updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/api/characters/custom/[id]/memory/route.ts"
git commit -m "feat: custom character memory summary endpoint"
```

---

### Task 8: Update chat stream to handle custom characters

**Files:**
- Modify: `app/api/chat/stream/route.ts`

- [ ] **Step 1: Update POST handler to accept customCharacterId**

Replace the top of the POST function (lines 15–31) — change the destructuring and add custom character branch:

```ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { getCharacter } from "@/lib/characters";
import { canUseCharacter } from "@/lib/plan";
import { getCustomCharacterById, buildCustomCharacterSystemPrompt } from "@/lib/custom-characters";
import type { DbProfile } from "@/lib/db-types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MAX_TOKENS: Record<string, number> = {
  very_short: 80, short: 130, medium: 200, long: 300,
};

export async function POST(req: NextRequest) {
  const { characterId, customCharacterId, scenario: rawScenario, messages, isInitial, sessionId } =
    await req.json();

  const authHeader = req.headers.get("authorization");
  const hasBearerToken = authHeader?.startsWith("Bearer ");
  const userId = await getUserIdFromRequest(req);
  if (hasBearerToken && !userId) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }

  const effectivePlan = userId
    ? await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single<Pick<DbProfile, "plan">>()
        .then((r) => r.data?.plan ?? "free")
    : "free";

  // ── Custom character path ──────────────────────────────────────────────────
  if (customCharacterId) {
    if (!userId) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
    }

    const customChar = await getCustomCharacterById(customCharacterId, userId);
    if (!customChar) {
      return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
    }

    const systemPrompt = buildCustomCharacterSystemPrompt(customChar);

    let apiMessages = isInitial
      ? [{ role: "user" as const, content: "Start the session naturally." }]
      : (messages as Array<{ role: string; content: string }>).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

    if (!isInitial && apiMessages.length > 0 && apiMessages[0].role === "assistant") {
      apiMessages = [{ role: "user" as const, content: "Begin the session." }, ...apiMessages];
    }

    let newSessionId: string | null = sessionId ?? null;
    if (isInitial) {
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: userId, character_id: "custom", custom_character_id: customCharacterId, scenario: null })
        .select("id")
        .single();
      if (session) newSessionId = (session as { id: string }).id;
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: systemPrompt,
      messages: apiMessages,
    });

    const sessionIdHeader = newSessionId ?? "";

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          }
          if (userId && newSessionId) {
            if (isInitial) {
              await supabaseAdmin.from("messages").insert({ session_id: newSessionId, role: "assistant", content: fullText });
            } else {
              const lastUser = (messages as Array<{ role: string; content: string }>)[messages.length - 1];
              await supabaseAdmin.from("messages").insert([
                { session_id: newSessionId, role: "user", content: lastUser.content },
                { session_id: newSessionId, role: "assistant", content: fullText },
              ]);
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
          return;
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": sessionIdHeader,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Standard character path (existing code unchanged below) ───────────────
  const character = getCharacter(characterId);
  if (!character) {
    return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
  }
  // ... rest of existing code unchanged
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add app/api/chat/stream/route.ts
git commit -m "feat: support customCharacterId in chat stream"
```

---

## Phase 3 — Custom Character Frontend

### Task 9: `components/CustomCharacterCard.tsx`

**Files:**
- Create: `components/CustomCharacterCard.tsx`

- [ ] **Step 1: Create component**

```tsx
"use client";
import Link from "next/link";
import Image from "next/image";
import type { DbCustomCharacter } from "@/lib/db-types";

interface Props {
  character: DbCustomCharacter;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CustomCharacterCard({ character }: Props) {
  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/18 hover:-translate-y-1">
      {/* Personal badge */}
      <div className="absolute top-2.5 right-2.5 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 backdrop-blur-sm">
        Personal
      </div>

      {/* Avatar */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        {character.avatar_url ? (
          <Image
            src={character.avatar_url}
            alt={character.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#a78bfa]/5">
            <span className="text-4xl font-bold text-[#a78bfa]">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/30 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 -mt-2 relative z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-semibold text-base leading-tight">{character.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
        {character.relationship_hint && (
          <p className="text-white/40 text-xs mb-1 capitalize">{character.relationship_hint}</p>
        )}
        <p className="text-white/25 text-[11px] mb-3">
          Last chat: {timeAgo(character.memory_updated_at ?? character.created_at)}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/practice?customCharacter=${character.id}&auto=true`}
            className="flex-1 text-center py-1.5 rounded-xl bg-white/7 border border-white/10 text-white/70 text-xs font-medium hover:bg-white/12 transition-all"
          >
            Continue →
          </Link>
          <Link
            href={`/characters/${character.id}/edit`}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/40 text-xs hover:text-white/70 transition-all"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/CustomCharacterCard.tsx
git commit -m "feat: CustomCharacterCard component"
```

---

### Task 10: Update `app/dashboard/page.tsx` — add My Characters section

**Files:**
- Modify: `app/dashboard/page.tsx`

- [ ] **Step 1: Add getUserCustomCharacters import and fetch**

At the top of the file, add the import:
```ts
import { getUserCustomCharacters } from "@/lib/custom-characters";
import { getCustomCharacterLimit } from "@/lib/plan";
import CustomCharacterCard from "@/components/CustomCharacterCard";
import type { DbCustomCharacter } from "@/lib/db-types";
```

In `getUserData()`, add to the returned object:
```ts
// Add this fetch inside getUserData, after the existing supabase queries:
const { data: customCharsData } = await supabaseAdmin
  .from("custom_characters")
  .select("*")
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

// Add to the return:
return {
  // ... existing fields ...
  customCharacters: (customCharsData ?? []) as DbCustomCharacter[],
};
```

- [ ] **Step 2: Add My Characters section before Practice Characters**

In the JSX, replace the Characters section (`{/* Characters */}`) with:

```tsx
{/* My Characters */}
<div className="mb-10">
  <div className="flex items-center justify-between mb-5">
    <div className="flex items-center gap-2">
      <h2 className="text-white font-semibold text-base">My Characters</h2>
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25">
        {userData.plan === "free" ? "PRO" : userData.plan.toUpperCase()}
      </span>
    </div>
    <span className="text-white/30 text-xs">
      {userData.customCharacters.length} / {getCustomCharacterLimit(userData.plan)} used
    </span>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {/* Existing custom characters */}
    {userData.customCharacters.map((char) => (
      <CustomCharacterCard key={char.id} character={char} />
    ))}

    {/* Add new slot (if limit not reached and plan allows) */}
    {getCustomCharacterLimit(userData.plan) > 0 &&
      userData.customCharacters.length < getCustomCharacterLimit(userData.plan) && (
        <Link href="/characters/new">
          <div className="aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 text-white/30 hover:border-white/25 hover:text-white/60 hover:bg-white/3 transition-all cursor-pointer">
            <span className="text-2xl leading-none">＋</span>
            <span className="text-xs font-medium">Add character</span>
          </div>
        </Link>
      )}

    {/* Upgrade prompt if free */}
    {getCustomCharacterLimit(userData.plan) === 0 && (
      <div className="aspect-[3/4] flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/8 text-white/20">
        <span className="text-2xl leading-none">✦</span>
        <span className="text-xs font-medium">Available on Pro</span>
      </div>
    )}

    {/* Locked premium slots (show remaining premium slots to pro users) */}
    {userData.plan === "pro" &&
      Array.from({ length: getCustomCharacterLimit("premium") - getCustomCharacterLimit("pro") }).map((_, i) => (
        <div
          key={i}
          className="aspect-[3/4] flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/5 text-white/15 bg-white/[0.01]"
        >
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/30">
            ✦ Premium
          </span>
        </div>
      ))}
  </div>
</div>

{/* Practice Characters */}
<div className="mb-10" id="characters">
  <div className="flex items-center justify-between mb-5">
    <h2 className="text-white font-semibold text-base">{Td.allCharacters}</h2>
    <span className="text-white/30 text-xs">{CHARACTERS.length} characters</span>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {CHARACTERS.map((char) => (
      <CharacterCard
        key={char.id}
        character={char}
        locked={!canUseCharacter(userData?.plan, char.id)}
        label={Td.start}
      />
    ))}
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript and check page loads**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add My Characters section to dashboard"
```

---

### Task 11: `app/characters/new/page.tsx` — create custom character

**Files:**
- Create: `app/characters/new/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCharacterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relationshipHint, setRelationshipHint] = useState("");
  const [personalityPrompt, setPersonalityPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || personalityPrompt.trim().length < 10) {
      setError("Name and personality description (min 10 chars) are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/characters/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        relationship_hint: relationshipHint.trim() || null,
        personality_prompt: personalityPrompt.trim(),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      if (data.error === "LIMIT_REACHED") {
        setError("You've reached your custom character limit. Upgrade to add more.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-white font-semibold text-sm">New Character</span>
        <div className="w-6" />
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-white text-2xl font-bold mb-2">Create your character</h1>
        <p className="text-white/40 text-sm mb-8">
          This character will remember your conversations and adapt to you over time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Sarah"
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1.5">
              Relationship <span className="text-white/30">(optional)</span>
            </label>
            <input
              value={relationshipHint}
              onChange={(e) => setRelationshipHint(e.target.value)}
              maxLength={100}
              placeholder="e.g. my professor, a colleague, my manager"
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-white/60 text-xs">Personality & style</label>
              <span className="text-white/30 text-xs">{personalityPrompt.length}/300</span>
            </div>
            <textarea
              value={personalityPrompt}
              onChange={(e) => setPersonalityPrompt(e.target.value.slice(0, 300))}
              rows={5}
              placeholder="Describe how this person speaks and behaves. e.g. Strict but fair. Expects preparation. Gets straight to the point. Doesn't sugar-coat feedback."
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
            />
            <p className="text-white/25 text-xs mt-1.5">
              Min 10 characters. Be specific — the more detail, the more realistic.
            </p>
          </div>

          {error && (
            <p className="text-red-400/80 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-white text-[#080808] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create character"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/characters/new/page.tsx
git commit -m "feat: create custom character page"
```

---

### Task 12: Update practice page to send memory update on session end

**Files:**
- Modify: `app/practice/page.tsx`

- [ ] **Step 1: Read the practice page to find where session ends**

```bash
grep -n "sessionId\|endSession\|useEffect\|beforeunload\|customCharacter" app/practice/page.tsx | head -30
```

- [ ] **Step 2: Add customCharacter support to practice page URL params**

Find where `characterId` is read from searchParams and add `customCharacter` param:

```ts
// In the component, read both:
const characterId = searchParams.get("character");
const customCharacterId = searchParams.get("customCharacter");
```

Pass `customCharacterId` to the chat stream fetch:
```ts
body: JSON.stringify({
  characterId,
  customCharacterId,   // add this
  messages,
  isInitial,
  sessionId,
  scenario,
}),
```

- [ ] **Step 3: Add memory update on session end**

Add a function that calls the memory endpoint:
```ts
async function updateMemory(customCharId: string, sessId: string) {
  await fetch(`/api/characters/custom/${customCharId}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: sessId }),
  }).catch(() => {}); // best-effort, don't block navigation
}
```

Add a `beforeunload` listener in a `useEffect` when `customCharacterId` and `sessionId` are set:
```ts
useEffect(() => {
  if (!customCharacterId || !sessionId) return;
  const handler = () => { updateMemory(customCharacterId, sessionId); };
  window.addEventListener("beforeunload", handler);
  return () => window.removeEventListener("beforeunload", handler);
}, [customCharacterId, sessionId]);
```

Also call `updateMemory` when user clicks "End session" (if such a button exists).

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add app/practice/page.tsx
git commit -m "feat: practice page supports custom characters and memory updates"
```

---

### Task 13: `app/characters/[id]/edit/page.tsx` — edit custom character

**Files:**
- Create: `app/characters/[id]/edit/page.tsx`

- [ ] **Step 1: Create edit page**

```tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function EditCharacterPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [relationshipHint, setRelationshipHint] = useState("");
  const [personalityPrompt, setPersonalityPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/characters/custom")
      .then((r) => r.json())
      .then((chars) => {
        const char = chars.find((c: { id: string }) => c.id === id);
        if (char) {
          setName(char.name);
          setRelationshipHint(char.relationship_hint ?? "");
          setPersonalityPrompt(char.personality_prompt);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/characters/custom/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        relationship_hint: relationshipHint.trim() || null,
        personality_prompt: personalityPrompt.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save. Please try again."); return; }
    router.push("/dashboard");
  }

  async function handleDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/characters/custom/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-white/40 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-white font-semibold text-sm">Edit Character</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400/60 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Relationship <span className="text-white/30">(optional)</span></label>
            <input
              value={relationshipHint}
              onChange={(e) => setRelationshipHint(e.target.value)}
              maxLength={100}
              placeholder="e.g. my professor, a colleague"
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-white/60 text-xs">Personality & style</label>
              <span className="text-white/30 text-xs">{personalityPrompt.length}/300</span>
            </div>
            <textarea
              value={personalityPrompt}
              onChange={(e) => setPersonalityPrompt(e.target.value.slice(0, 300))}
              rows={5}
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
            />
          </div>
          {error && <p className="text-red-400/80 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-white text-[#080808] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/characters/[id]/edit/page.tsx"
git commit -m "feat: edit and delete custom character page"
```

---

> **Note — Deferred Premium features (voice & avatar):**
> Voice selection (Azure catalog picker) and avatar (photo upload + DALL-E generation) are Premium-only features planned for the next iteration. The DB columns (`voice_id`, `avatar_url`) are already in the schema. The edit page and create form can be extended to include these in a follow-up plan once the core custom character flow is live.

---

### Task 14: Deploy and verify

- [ ] **Step 1: Run full build**

```bash
cd "C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web"
npm run build 2>&1 | tail -20
```

Expected: Build successful, no type errors.

- [ ] **Step 2: Manual smoke test — standard characters**

Start dev server: `npm run dev`

1. Login → Dashboard → verify 4 characters (Ethan, Nadia, Dr. Chen, Morgan)
2. Free account → Nadia/Dr. Chen/Morgan should show lock icon
3. Pro/Premium account → all 4 accessible

- [ ] **Step 3: Manual smoke test — custom characters**

1. Pro account → Dashboard → "My Characters" section visible with + card
2. Click + → `/characters/new` page loads
3. Fill form → submit → redirected to dashboard → character card appears
4. Click "Continue" → practice page loads with custom character
5. Have a conversation → navigate away → check DB for memory_summary update

- [ ] **Step 4: Deploy**

```bash
vercel --prod
```

- [ ] **Step 5: Push to origin**

```bash
git push origin master
```
