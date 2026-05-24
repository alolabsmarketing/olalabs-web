# OlaLabs Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android-first React Native app (Expo) with full feature parity to olalabs.io web app.

**Architecture:** Mobile app calls existing `https://olalabs.io/api/*` endpoints using `Authorization: Bearer` tokens stored in SecureStore. Three small backend changes required (auth token in response body, streaming endpoint, dashboard API). All UI in NativeWind (Tailwind classes).

**Tech Stack:** Expo SDK, Expo Router, Zustand, React Query, NativeWind, expo-av, expo-speech-recognition, expo-secure-store

---

## PHASE 1 — Backend changes (web repo)
> Path: `C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web`

---

### Task 1: getUserIdFromRequest — Bearer header desteği

**Files:**
- Modify: `lib/auth-server.ts`

- [ ] **Dosyayı aç ve güncelle**

```typescript
// lib/auth-server.ts
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest } from "next/server";

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // Authorization: Bearer <token> (mobile) veya sb-access-token cookie (web)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.cookies.get("sb-access-token")?.value;

  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}
```

- [ ] **TypeScript kontrolü**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web
npx tsc --noEmit
```
Beklenen: hata yok

- [ ] **Commit**

```bash
git add lib/auth-server.ts
git commit -m "feat: getUserIdFromRequest — Authorization: Bearer header desteği (mobile için)"
```

---

### Task 2: Login + Register — token JSON body'ye eklenir

**Files:**
- Modify: `app/api/auth/login/route.ts`
- Modify: `app/api/auth/register/route.ts`

- [ ] **login/route.ts — `const res = NextResponse.json({ success: true })` satırını değiştir**

```typescript
// ESKİ:
const res = NextResponse.json({ success: true });

// YENİ (satırı şununla değiştir):
const res = NextResponse.json({
  success: true,
  accessToken: data.session.access_token,
  refreshToken: data.session.refresh_token,
});
```
Dosyanın geri kalanı (cookie set etme kısmı) aynı kalır.

- [ ] **register/route.ts — benzer değişiklik**

```typescript
// ESKİ:
const res = NextResponse.json({ success: true });

// YENİ:
const res = NextResponse.json({
  success: true,
  accessToken: session.session.access_token,
  refreshToken: session.session.refresh_token,
});
```

- [ ] **TypeScript kontrolü**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add app/api/auth/login/route.ts app/api/auth/register/route.ts
git commit -m "feat: auth — accessToken + refreshToken JSON body'de döner (mobil için, web etkilenmez)"
```

---

### Task 3: Google OAuth mobil callback endpoint'i

**Files:**
- Create: `app/api/auth/google/callback-mobile/route.ts`

Web callback redirect yapıyor (GET). Mobil callback JSON döner (POST).

- [ ] **Dosyayı oluştur**

```typescript
// app/api/auth/google/callback-mobile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) {
      return NextResponse.json({ error: "Missing code or redirectUri" }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: "Google not configured" }, { status: 500 });
    }

    // Code'u Google token'ına çevir
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.json({ error: "Google token exchange failed" }, { status: 400 });
    }

    // Google kullanıcı bilgisi al
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();
    if (!googleUser.email) {
      return NextResponse.json({ error: "No email from Google" }, { status: 400 });
    }

    // Supabase'de kullanıcıyı bul veya oluştur
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, level")
      .eq("email", googleUser.email)
      .single();

    if (!existingProfile) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: { full_name: googleUser.name ?? "", avatar_url: googleUser.picture ?? "" },
      });
      if (createError || !newUser.user) {
        return NextResponse.json({ error: "User creation failed" }, { status: 500 });
      }
      await supabaseAdmin.from("profiles").insert({
        id: newUser.user.id,
        email: googleUser.email,
        plan: "free",
      });
    }

    // Magic link ile oturum oluştur
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: googleUser.email,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });
    if (verifyError || !verifyData.session) {
      return NextResponse.json({ error: "OTP verification failed" }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("level")
      .eq("email", googleUser.email)
      .single();

    return NextResponse.json({
      accessToken: verifyData.session.access_token,
      refreshToken: verifyData.session.refresh_token,
      needsOnboarding: !profile?.level,
    });
  } catch (e) {
    console.error("Google mobile callback error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **TypeScript kontrolü**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add app/api/auth/google/callback-mobile/route.ts
git commit -m "feat: /api/auth/google/callback-mobile — JSON token dönen mobil OAuth endpoint"
```

---

### Task 4: /api/dashboard endpoint'i

**Files:**
- Create: `app/api/dashboard/route.ts`

Dashboard page.tsx server component'indeki `getUserData()` fonksiyonunu API endpoint'e taşı.

- [ ] **Dosyayı oluştur**

```typescript
// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";

function calculateStreak(dates: Array<{ date: string }>): number {
  if (!dates?.length) return 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dates[0].date !== today && dates[0].date !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].date);
    const curr = new Date(dates[i].date);
    if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: recentSessions }, { data: usageDates }] = await Promise.all([
    supabaseAdmin.from("profiles").select("email, plan, sessions_count, level, goal, language").eq("id", userId).single(),
    supabaseAdmin.from("sessions")
      .select("started_at, ended_at, character_id, analysis_results(grammar_score, vocabulary_score, fluency_score)")
      .eq("user_id", userId).order("started_at", { ascending: false }).limit(20),
    supabaseAdmin.from("daily_usage").select("date").eq("user_id", userId)
      .order("date", { ascending: false }).limit(60),
  ]);

  const streak = calculateStreak(usageDates ?? []);

  const scores = (recentSessions ?? [])
    .flatMap((s: Record<string, unknown>) => (s.analysis_results as Array<Record<string, number>> ?? []))
    .map((a) => ((a.grammar_score ?? 0) + (a.vocabulary_score ?? 0) + (a.fluency_score ?? 0)) / 3)
    .filter((s) => s > 0);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const totalMinutes = (recentSessions ?? [])
    .filter((s: Record<string, unknown>) => s.ended_at)
    .reduce((acc: number, s: Record<string, unknown>) => {
      const mins = Math.round(
        (new Date(s.ended_at as string).getTime() - new Date(s.started_at as string).getTime()) / 60000
      );
      return acc + Math.max(0, mins);
    }, 0);

  const charStats: Record<string, { sessions: number; minutes: number }> = {};
  for (const s of recentSessions ?? []) {
    const cid = (s as Record<string, unknown>).character_id as string ?? "unknown";
    if (!charStats[cid]) charStats[cid] = { sessions: 0, minutes: 0 };
    charStats[cid].sessions += 1;
    if ((s as Record<string, unknown>).ended_at) {
      const mins = Math.round(
        (new Date((s as Record<string, unknown>).ended_at as string).getTime() -
          new Date((s as Record<string, unknown>).started_at as string).getTime()) / 60000
      );
      charStats[cid].minutes += Math.max(0, mins);
    }
  }

  return NextResponse.json({
    email: (profile as Record<string, unknown> | null)?.email ?? "",
    plan: (profile as Record<string, unknown> | null)?.plan ?? "free",
    sessionsCount: (profile as Record<string, unknown> | null)?.sessions_count ?? 0,
    totalMinutes,
    avgScore,
    level: (profile as Record<string, unknown> | null)?.level ?? null,
    goal: (profile as Record<string, unknown> | null)?.goal ?? null,
    streak,
    charStats,
  });
}
```

- [ ] **TypeScript kontrolü**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add app/api/dashboard/route.ts
git commit -m "feat: /api/dashboard GET endpoint — mobil için dashboard verisi"
```

---

### Task 5: /api/chat/stream — streaming endpoint

**Files:**
- Create: `app/api/chat/stream/route.ts`

`/api/chat` ile aynı mantık, yanıt `ReadableStream` olarak gelir. Mobil token token okur.

- [ ] **Dosyayı oluştur**

```typescript
// app/api/chat/stream/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { getCharacter } from "@/lib/characters";
import { getPlanLimits, canUseCharacter } from "@/lib/plan";
import type { DbProfile, DbDailyUsage, DbSession } from "@/lib/db-types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MAX_TOKENS: Record<string, number> = {
  very_short: 80, short: 130, medium: 200, long: 300,
};

export async function POST(req: NextRequest) {
  const { characterId, scenario: rawScenario, messages, isInitial, sessionId } = await req.json();

  const character = getCharacter(characterId);
  if (!character) {
    return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
  }

  const scenario = rawScenario
    ? String(rawScenario).slice(0, 500).replace(/[\r\n]+/g, " ").trim()
    : null;

  const scenarioPart = scenario
    ? `\n\nSCENARIO: ${scenario}\n\nDrop into this scenario immediately — you're already in the scene. Take the role naturally. Don't announce it. Just start.`
    : "";

  const systemPrompt = character.systemPrompt + scenarioPart;
  const maxTokens = MAX_TOKENS[character.style.responseLength] ?? 150;
  const userId = await getUserIdFromRequest(req);

  // Plan + limit kontrolleri (isInitial)
  if (isInitial && userId) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single<Pick<DbProfile, "plan">>();
    const userPlan = profile?.plan ?? "free";
    const limits = getPlanLimits(userPlan);

    if (!canUseCharacter(userPlan, characterId)) {
      return new Response(JSON.stringify({ error: "CHARACTER_LOCKED" }), { status: 403 });
    }

    if (limits.sessionsPerDay !== Infinity) {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabaseAdmin.from("daily_usage").select("session_count").eq("user_id", userId).eq("date", today).single<Pick<DbDailyUsage, "session_count">>();
      const count = usage?.session_count ?? 0;
      if (count >= limits.sessionsPerDay) {
        return new Response(JSON.stringify({ error: "SESSION_LIMIT" }), { status: 403 });
      }
      await supabaseAdmin.from("daily_usage").upsert(
        { user_id: userId, date: today, session_count: count + 1 },
        { onConflict: "user_id,date" }
      );
    }
  }

  // Session süre kontrolü (non-initial)
  if (!isInitial && userId && sessionId) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single<Pick<DbProfile, "plan">>();
    const limits = getPlanLimits(profile?.plan ?? "free");
    if (limits.sessionMinutes !== Infinity) {
      const { data: sessionRow } = await supabaseAdmin.from("sessions").select("started_at").eq("id", sessionId).eq("user_id", userId).single<Pick<DbSession, "started_at">>();
      if (sessionRow) {
        const elapsed = (Date.now() - new Date(sessionRow.started_at).getTime()) / 60000;
        if (elapsed >= limits.sessionMinutes) {
          return new Response(JSON.stringify({ error: "SESSION_LIMIT" }), { status: 403 });
        }
      }
    }
  }

  let apiMessages = isInitial
    ? [{ role: "user" as const, content: scenario ? "Start. You're in the scene. Go." : "Start the session naturally." }]
    : messages.map((m: { role: string; content: string }) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (!isInitial && apiMessages.length > 0 && apiMessages[0].role === "assistant") {
    apiMessages = [{ role: "user" as const, content: "Begin the session." }, ...apiMessages];
  }

  // Session oluştur (initial + userId)
  let newSessionId: string | null = sessionId ?? null;
  if (isInitial && userId) {
    const { data: session } = await supabaseAdmin.from("sessions")
      .insert({ user_id: userId, character_id: characterId, scenario: scenario ?? null })
      .select("id").single();
    if (session) newSessionId = session.id;
  }

  // Stream başlat
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: apiMessages,
  });

  const sessionIdHeader = newSessionId ?? "";

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const chunk = event.delta.text;
          fullText += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      }
      controller.close();

      // Mesajları kaydet
      if (userId && newSessionId) {
        if (isInitial) {
          await supabaseAdmin.from("messages").insert({ session_id: newSessionId, role: "assistant", content: fullText });
        } else {
          const lastUser = messages[messages.length - 1];
          await supabaseAdmin.from("messages").insert([
            { session_id: newSessionId, role: "user", content: lastUser.content },
            { session_id: newSessionId, role: "assistant", content: fullText },
          ]);
        }
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
```

- [ ] **TypeScript kontrolü**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add app/api/chat/stream/route.ts
git commit -m "feat: /api/chat/stream — streaming chat endpoint (mobil + web performansı)"
```

---

## PHASE 2 — Mobil proje kurulumu
> Yeni proje: `C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-mobile`

---

### Task 6: Expo projesi oluştur

**Files:**
- Create: `olalabs-mobile/` (tüm proje)

- [ ] **Expo projesi başlat**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs
npx create-expo-app olalabs-mobile --template blank-typescript
cd olalabs-mobile
```

- [ ] **Gerekli paketleri yükle**

```bash
npx expo install expo-router expo-secure-store expo-av expo-speech-recognition expo-auth-session expo-web-browser expo-linking
npm install zustand @tanstack/react-query
npx expo install nativewind tailwindcss react-native-reanimated react-native-safe-area-context react-native-screens
```

- [ ] **app.json'u güncelle** — scheme, name, Android config

```json
{
  "expo": {
    "name": "OlaLabs",
    "slug": "olalabs",
    "version": "1.0.0",
    "scheme": "olalabs",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#080808"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#080808"
      },
      "package": "io.olalabs.app"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-speech-recognition",
        {
          "microphonePermission": "OlaLabs needs microphone access for voice practice.",
          "speechRecognitionPermission": "OlaLabs needs speech recognition for voice input."
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

- [ ] **tailwind.config.js oluştur**

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#080808",
        surface: "#111111",
        border: "rgba(255,255,255,0.08)",
      },
    },
  },
  plugins: [],
};
```

- [ ] **babel.config.js güncelle**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **metro.config.js oluştur**

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **global.css oluştur**

```css
@import "tailwindcss";
```

- [ ] **tsconfig.json güncelle**

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Git repo başlat**

```bash
git init
git add .
git commit -m "chore: expo project init — olalabs-mobile"
```

---

### Task 7: Paylaşılan lib dosyaları + constants

**Files:**
- Create: `lib/plan.ts`
- Create: `lib/db-types.ts`
- Create: `constants/colors.ts`
- Create: `constants/api.ts`

- [ ] **lib/plan.ts** — web'den birebir kopyala

```typescript
// lib/plan.ts — web/lib/plan.ts ile aynı dosya
export type Plan = 'free' | 'pro' | 'premium'

export interface PlanLimits {
  sessionsPerDay: number
  sessionMinutes: number
  voiceMinutesPerDay: number
  allowedCharacters: string[] | 'all'
  hasAnalysis: boolean
  hasProgressCharts: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    sessionsPerDay: 3,
    sessionMinutes: 5,
    voiceMinutesPerDay: 10,
    allowedCharacters: ['ethan', 'noah'],
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
```

- [ ] **lib/db-types.ts** — web'den birebir kopyala

```typescript
// lib/db-types.ts — web/lib/db-types.ts ile aynı dosya
import type { Plan } from "./plan";

export interface DbProfile {
  id: string;
  email: string;
  plan: Plan;
  native_language: string | null;
  practice_language: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export interface DbDailyUsage {
  user_id: string;
  date: string;
  session_count: number;
  voice_seconds: number;
}

export interface DbSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface AnalysisResult {
  grammar_score: number;
  vocabulary_score: number;
  fluency_score: number;
  overall_score: number;
  grammar_errors: Array<{ original: string; corrected: string; explanation: string }>;
  vocabulary_suggestions: Array<{ word: string; alternatives: string[]; context: string }>;
  tips: [string, string, string];
  summary: string;
}
```

- [ ] **constants/colors.ts**

```typescript
// constants/colors.ts
export const colors = {
  bg: "#080808",
  surface: "#111111",
  surfaceHover: "#161616",
  border: "rgba(255,255,255,0.08)",
  text: "#ffffff",
  textMuted: "rgba(255,255,255,0.4)",
  textDim: "rgba(255,255,255,0.15)",
  accent: "#ffffff",
} as const;
```

- [ ] **constants/api.ts**

```typescript
// constants/api.ts
export const API_BASE = "https://olalabs.io";
```

- [ ] **Commit**

```bash
git add lib/ constants/
git commit -m "chore: lib types ve constants eklendi"
```

---

## PHASE 3 — API wrapper + Stores

---

### Task 8: API wrapper (`lib/api.ts`)

**Files:**
- Create: `lib/api.ts`
- Create: `lib/__tests__/api.test.ts`

- [ ] **Test dosyasını yaz (önce)**

```typescript
// lib/__tests__/api.test.ts
import * as SecureStore from "expo-secure-store";
import { apiFetch } from "../api";

jest.mock("expo-secure-store");

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("apiFetch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it("Authorization header'ı access_token ile doldurur", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) =>
      Promise.resolve(key === "access_token" ? "tok123" : null)
    );
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: "ok" }),
    });

    await apiFetch("/api/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://olalabs.io/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok123" }),
      })
    );
  });

  it("401'de refresh token ile token yeniler", async () => {
    mockSecureStore.getItemAsync.mockImplementation((key) => {
      if (key === "access_token") return Promise.resolve("expired");
      if (key === "refresh_token") return Promise.resolve("refresh123");
      return Promise.resolve(null);
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ access_token: "new_tok", refresh_token: "new_ref" }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ data: "ok" }) });

    await apiFetch("/api/test");

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith("access_token", "new_tok");
  });
});
```

- [ ] **Test'in fail ettiğini doğrula**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-mobile
npx jest lib/__tests__/api.test.ts
```
Beklenen: FAIL — "Cannot find module '../api'"

- [ ] **lib/api.ts'i yaz**

```typescript
// lib/api.ts
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "@/constants/api";

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync("refresh_token");
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (data.access_token) {
    await SecureStore.setItemAsync("access_token", data.access_token);
    if (data.refresh_token) {
      await SecureStore.setItemAsync("refresh_token", data.refresh_token);
    }
    return data.access_token;
  }
  return null;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await SecureStore.getItemAsync("access_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token yenile (paralel isteklerin hepsini bekletmeden tek seferinde yenile)
    if (!refreshing) {
      refreshing = refreshAccessToken().finally(() => { refreshing = null; });
    }
    const newToken = await refreshing;
    if (!newToken) return res; // Refresh da başarısız — caller 401 alır

    const retryHeaders: HeadersInit = {
      ...headers,
      Authorization: `Bearer ${newToken}`,
    };
    return fetch(`${API_BASE}${path}`, { ...options, headers: retryHeaders });
  }

  return res;
}

export async function apiJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
```

**Not:** `/api/auth/refresh` endpoint'i gerekiyor — Task 9'da eklenir.

- [ ] **Test'i çalıştır**

```bash
npx jest lib/__tests__/api.test.ts
```
Beklenen: PASS

- [ ] **Commit**

```bash
git add lib/api.ts lib/__tests__/api.test.ts
git commit -m "feat: API wrapper — Bearer header + token refresh"
```

---

### Task 9: /api/auth/refresh endpoint'i (web repo)

**Files:**
- Create: `app/api/auth/refresh/route.ts` (web repo)

- [ ] **Web repo'ya geç ve dosya oluştur**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web
```

```typescript
// app/api/auth/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refreshToken" }, { status: 400 });
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    }

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  } catch (e) {
    console.error("Refresh token error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

- [ ] **TypeScript kontrolü ve commit**

```bash
npx tsc --noEmit
git add app/api/auth/refresh/route.ts
git commit -m "feat: /api/auth/refresh — mobil token yenileme endpoint"
```

---

### Task 10: Auth + Session store (mobil repo)

**Files:**
- Create: `stores/auth.store.ts`
- Create: `stores/session.store.ts`
- Create: `stores/__tests__/auth.store.test.ts`

- [ ] **Test yaz**

```typescript
// stores/__tests__/auth.store.test.ts
import * as SecureStore from "expo-secure-store";
import { useAuthStore } from "../auth.store";

jest.mock("expo-secure-store");
const mockStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("authStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ token: null, userId: null, userPlan: "free", isLoaded: false });
  });

  it("login token'ı store'a ve SecureStore'a yazar", async () => {
    mockStore.setItemAsync.mockResolvedValue(undefined);
    await useAuthStore.getState().login("tok123", "ref123", "user-1", "pro");

    expect(useAuthStore.getState().token).toBe("tok123");
    expect(useAuthStore.getState().userPlan).toBe("pro");
    expect(mockStore.setItemAsync).toHaveBeenCalledWith("access_token", "tok123");
  });

  it("logout store'u ve SecureStore'u temizler", async () => {
    mockStore.deleteItemAsync.mockResolvedValue(undefined);
    useAuthStore.setState({ token: "tok123", userId: "u1", userPlan: "pro", isLoaded: true });

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(mockStore.deleteItemAsync).toHaveBeenCalledWith("access_token");
  });
});
```

- [ ] **Test fail eder**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-mobile
npx jest stores/__tests__/auth.store.test.ts
```
Beklenen: FAIL

- [ ] **stores/auth.store.ts yaz**

```typescript
// stores/auth.store.ts
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import type { Plan } from "@/lib/plan";

interface AuthState {
  token: string | null;
  userId: string | null;
  userPlan: Plan;
  isLoaded: boolean;
  login: (token: string, refreshToken: string, userId: string, plan: Plan) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  updatePlan: (plan: Plan) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  userPlan: "free",
  isLoaded: false,

  login: async (token, refreshToken, userId, plan) => {
    await Promise.all([
      SecureStore.setItemAsync("access_token", token),
      SecureStore.setItemAsync("refresh_token", refreshToken),
      SecureStore.setItemAsync("user_id", userId),
      SecureStore.setItemAsync("user_plan", plan),
    ]);
    set({ token, userId, userPlan: plan });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync("access_token"),
      SecureStore.deleteItemAsync("refresh_token"),
      SecureStore.deleteItemAsync("user_id"),
      SecureStore.deleteItemAsync("user_plan"),
    ]);
    set({ token: null, userId: null, userPlan: "free" });
  },

  loadFromStorage: async () => {
    const [token, userId, userPlan] = await Promise.all([
      SecureStore.getItemAsync("access_token"),
      SecureStore.getItemAsync("user_id"),
      SecureStore.getItemAsync("user_plan"),
    ]);
    set({
      token,
      userId,
      userPlan: (userPlan as Plan) ?? "free",
      isLoaded: true,
    });
  },

  updatePlan: (plan) => set({ userPlan: plan }),
}));
```

- [ ] **stores/session.store.ts yaz**

```typescript
// stores/session.store.ts
import { create } from "zustand";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface SessionState {
  characterId: string | null;
  scenarioId: string | null;
  scenarioText: string | null;
  sessionId: string | null;
  messages: Message[];
  isRecording: boolean;
  sessionStartedAt: number | null;
  setCharacter: (id: string) => void;
  setScenario: (id: string | null, text: string | null) => void;
  startSession: (sessionId: string) => void;
  addMessage: (msg: Message) => void;
  setRecording: (v: boolean) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  characterId: null,
  scenarioId: null,
  scenarioText: null,
  sessionId: null,
  messages: [],
  isRecording: false,
  sessionStartedAt: null,

  setCharacter: (id) => set({ characterId: id }),
  setScenario: (id, text) => set({ scenarioId: id, scenarioText: text }),
  startSession: (sessionId) => set({ sessionId, sessionStartedAt: Date.now() }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setRecording: (v) => set({ isRecording: v }),
  reset: () => set({
    characterId: null, scenarioId: null, scenarioText: null,
    sessionId: null, messages: [], isRecording: false, sessionStartedAt: null,
  }),
}));
```

- [ ] **Test'i çalıştır**

```bash
npx jest stores/__tests__/auth.store.test.ts
```
Beklenen: PASS

- [ ] **Commit**

```bash
git add stores/
git commit -m "feat: auth + session store (Zustand)"
```

---

## PHASE 4 — Navigation + Auth Ekranları

---

### Task 11: Root layout + auth guard

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(app)/_layout.tsx`

- [ ] **app/_layout.tsx — root guard**

```typescript
// app/_layout.tsx
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { token, isLoaded } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    const inAuth = segments[0] === "(auth)";
    if (!token && !inAuth) router.replace("/(auth)/login");
    if (token && inAuth) router.replace("/(app)");
  }, [token, isLoaded, segments]);

  return <>{children}</>;
}

export default function RootLayout() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadFromStorage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthGuard>
    </QueryClientProvider>
  );
}
```

- [ ] **app/(auth)/_layout.tsx**

```typescript
// app/(auth)/_layout.tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **app/(app)/_layout.tsx — tab bar**

```typescript
// app/(app)/_layout.tsx
import { Tabs } from "expo-router";
import { Home, Mic, CreditCard, User } from "lucide-react-native";
import { colors } from "@/constants/colors";

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color }) => <Home size={20} color={color} /> }} />
      <Tabs.Screen name="practice/index" options={{ title: "Practice", tabBarIcon: ({ color }) => <Mic size={20} color={color} /> }} />
      <Tabs.Screen name="pricing" options={{ title: "Premium", tabBarIcon: ({ color }) => <CreditCard size={20} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color }) => <User size={20} color={color} /> }} />
      <Tabs.Screen name="practice/session" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **lucide-react-native yükle**

```bash
npm install lucide-react-native
```

- [ ] **Commit**

```bash
git add app/
git commit -m "feat: root layout, auth guard, tab navigation"
```

---

### Task 12: Login + Register ekranları

**Files:**
- Create: `app/(auth)/login.tsx`
- Create: `app/(auth)/register.tsx`

- [ ] **app/(auth)/login.tsx**

```typescript
// app/(auth)/login.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE } from "@/constants/api";
import { colors } from "@/constants/colors";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  async function handleLogin() {
    if (!email || !password) { Alert.alert("Error", "Email and password required"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Error", data.error ?? "Login failed"); return; }
      await login(data.accessToken, data.refreshToken, "", "free");
      // /api/auth/me'den plan + userId çek
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.accessToken}` },
      });
      const me = await meRes.json();
      await login(data.accessToken, data.refreshToken, me.userId ?? "", me.plan ?? "free");
      router.replace("/(app)");
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>
          olalabs
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 32 }}>
          Sign in to continue
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{
            backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
            borderRadius: 12, padding: 14, color: colors.text, marginBottom: 12,
          }}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={{
            backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
            borderRadius: 12, padding: 14, color: colors.text, marginBottom: 20,
          }}
        />

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          style={{ backgroundColor: colors.text, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 }}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={{ color: colors.bg, fontWeight: "600" }}>Sign In</Text>
          }
        </TouchableOpacity>

        <GoogleAuthButton />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Don't have an account? </Text>
          <Link href="/(auth)/register">
            <Text style={{ color: colors.text, fontSize: 13 }}>Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **app/(auth)/register.tsx**

```typescript
// app/(auth)/register.tsx
import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE } from "@/constants/api";
import { colors } from "@/constants/colors";
import GoogleAuthButton from "@/components/GoogleAuthButton";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  async function handleRegister() {
    if (!name || !email || !password) { Alert.alert("Error", "All fields required"); return; }
    if (password.length < 8) { Alert.alert("Error", "Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Error", data.error ?? "Registration failed"); return; }
      await login(data.accessToken, data.refreshToken, "", "free");
      router.replace("/onboarding");
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: "700", marginBottom: 8 }}>Create account</Text>
        <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 32 }}>Start practicing English today</Text>

        {[
          { value: name, setter: setName, placeholder: "Full name", secure: false, type: "default" as const },
          { value: email, setter: setEmail, placeholder: "Email", secure: false, type: "email-address" as const },
          { value: password, setter: setPassword, placeholder: "Password (min 8 chars)", secure: true, type: "default" as const },
        ].map(({ value, setter, placeholder, secure, type }) => (
          <TextInput
            key={placeholder}
            value={value}
            onChangeText={setter}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            keyboardType={type}
            secureTextEntry={secure}
            autoCapitalize="none"
            style={{
              backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
              borderRadius: 12, padding: 14, color: colors.text, marginBottom: 12,
            }}
          />
        ))}

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          style={{ backgroundColor: colors.text, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12, marginTop: 8 }}
        >
          {loading
            ? <ActivityIndicator color={colors.bg} />
            : <Text style={{ color: colors.bg, fontWeight: "600" }}>Create Account</Text>
          }
        </TouchableOpacity>

        <GoogleAuthButton />

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>Already have an account? </Text>
          <Link href="/(auth)/login">
            <Text style={{ color: colors.text, fontSize: 13 }}>Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Commit**

```bash
git add app/(auth)/
git commit -m "feat: login + register ekranları"
```

---

### Task 13: Google OAuth + GoogleAuthButton component

**Files:**
- Create: `components/GoogleAuthButton.tsx`
- Create: `app/(auth)/google-callback.tsx`

**Ön koşul:** Google Cloud Console'da Android OAuth client oluşturulmuş olmalı. Gereken:
1. `console.cloud.google.com` → APIs & Services → Credentials → Create OAuth client
2. Application type: Android
3. Package name: `io.olalabs.app`
4. SHA-1 fingerprint: `cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-mobile && npx expo credentials:manager` ile alınır
5. Oluşan `client_id`'yi `app.json`'a ekle: `"androidClientId": "xxx.apps.googleusercontent.com"`

- [ ] **components/GoogleAuthButton.tsx**

```typescript
// components/GoogleAuthButton.tsx
import { TouchableOpacity, Text, ActivityIndicator, Alert } from "react-native";
import { useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE } from "@/constants/api";
import { colors } from "@/constants/colors";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleAuthButton() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  const [, response, promptAsync] = Google.useAuthRequest({
    androidClientId: Constants.expoConfig?.extra?.androidGoogleClientId,
    redirectUri: "olalabs://auth/google-callback",
  });

  async function handleGoogleLogin() {
    setLoading(true);
    try {
      const result = await promptAsync();
      if (result.type !== "success" || !result.params.code) {
        if (result.type !== "cancel") Alert.alert("Error", "Google sign-in failed");
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/google/callback-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: result.params.code,
          redirectUri: "olalabs://auth/google-callback",
        }),
      });

      const data = await res.json();
      if (!res.ok) { Alert.alert("Error", data.error ?? "Google sign-in failed"); return; }

      await login(data.accessToken, data.refreshToken, "", "free");
      router.replace(data.needsOnboarding ? "/onboarding" : "/(app)");
    } catch {
      Alert.alert("Error", "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity
      onPress={handleGoogleLogin}
      disabled={loading}
      style={{
        backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1,
        borderRadius: 12, padding: 14, alignItems: "center",
      }}
    >
      {loading
        ? <ActivityIndicator color={colors.text} />
        : <Text style={{ color: colors.text, fontWeight: "500" }}>Continue with Google</Text>
      }
    </TouchableOpacity>
  );
}
```

- [ ] **app.json'a extra config ekle**

```json
"extra": {
  "androidGoogleClientId": "BURAYA_GOOGLE_CLIENT_ID_GEL"
}
```

- [ ] **Commit**

```bash
git add components/GoogleAuthButton.tsx app.json
git commit -m "feat: Google OAuth (Expo AuthSession)"
```

---

## PHASE 5 — Ana Ekranlar

---

### Task 14: Hooks (React Query)

**Files:**
- Create: `hooks/useProfile.ts`
- Create: `hooks/useDashboard.ts`
- Create: `hooks/useScenarios.ts`

- [ ] **hooks/useProfile.ts**

```typescript
// hooks/useProfile.ts
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

interface ProfileData {
  plan: string;
  nativeLanguage: string | null;
  practiceLanguage: string | null;
}

export function useProfile() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => apiJson<ProfileData>("/api/auth/me"),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });
}
```

- [ ] **hooks/useDashboard.ts**

```typescript
// hooks/useDashboard.ts
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

interface DashboardData {
  email: string;
  plan: string;
  sessionsCount: number;
  totalMinutes: number;
  avgScore: number | null;
  level: string | null;
  goal: string | null;
  streak: number;
  charStats: Record<string, { sessions: number; minutes: number }>;
}

export function useDashboard() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiJson<DashboardData>("/api/dashboard"),
    enabled: !!token,
    staleTime: 1000 * 60 * 2,
  });
}
```

- [ ] **hooks/useScenarios.ts**

```typescript
// hooks/useScenarios.ts
import { useQuery } from "@tanstack/react-query";
import { apiJson } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

interface Scenario {
  id: string;
  slug: string;
  category: string;
  icon: string;
  title_en: string;
  description_en: string;
  min_plan: string;
  sort_order: number;
}

export function useScenarios() {
  const token = useAuthStore((s) => s.token);
  return useQuery({
    queryKey: ["scenarios"],
    queryFn: () => apiJson<Scenario[]>("/api/scenarios"),
    enabled: !!token,
    staleTime: 1000 * 60 * 5,
  });
}
```

- [ ] **Commit**

```bash
git add hooks/
git commit -m "feat: React Query hooks — profile, dashboard, scenarios"
```

---

### Task 15: Dashboard ekranı

**Files:**
- Create: `app/(app)/index.tsx`

- [ ] **app/(app)/index.tsx**

```typescript
// app/(app)/index.tsx
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Flame, Clock, Star, MessageCircle } from "lucide-react-native";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuthStore } from "@/stores/auth.store";
import { colors } from "@/constants/colors";

export default function DashboardScreen() {
  const { data, isLoading } = useDashboard();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  if (isLoading && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const stats = [
    { icon: MessageCircle, label: "Sessions", value: String(data?.sessionsCount ?? 0) },
    { icon: Clock, label: "Practice", value: data && data.totalMinutes > 0 ? `${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m` : "0h" },
    { icon: Star, label: "Avg Score", value: data?.avgScore ? `${data.avgScore}%` : "—" },
    { icon: Flame, label: "Streak", value: data?.streak ? `${data.streak}🔥` : "—" },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 4 }}>olalabs</Text>
      <Text style={{ color: colors.textMuted, fontSize: 14, marginBottom: 28 }}>
        {data?.email ? `Hi, ${data.email.split("@")[0]}` : "Welcome back"}
      </Text>

      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 28 }}>
        {stats.map(({ icon: Icon, label, value }) => (
          <View key={label} style={{ width: "47%", backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, alignItems: "center" }}>
            <Icon size={18} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700", marginTop: 6 }}>{value}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Start practicing CTA */}
      <TouchableOpacity
        onPress={() => router.push("/(app)/practice")}
        style={{ backgroundColor: colors.text, borderRadius: 16, padding: 16, alignItems: "center", marginBottom: 28 }}
      >
        <Text style={{ color: colors.bg, fontWeight: "700", fontSize: 15 }}>Start Practicing</Text>
      </TouchableOpacity>

      {/* Recent activity */}
      {data?.charStats && Object.keys(data.charStats).length > 0 && (
        <View style={{ marginBottom: 28 }}>
          <Text style={{ color: colors.text, fontWeight: "600", marginBottom: 12 }}>Recent Activity</Text>
          {Object.entries(data.charStats)
            .sort(([, a], [, b]) => b.sessions - a.sessions)
            .slice(0, 4)
            .map(([charId, stats]) => (
              <View key={charId} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.text, textTransform: "capitalize" }}>{charId}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{stats.sessions} sessions · {stats.minutes}m</Text>
              </View>
            ))}
        </View>
      )}

      {/* Plan badge */}
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>Current Plan</Text>
          <Text style={{ color: colors.text, fontWeight: "600", textTransform: "capitalize", marginTop: 2 }}>{data?.plan ?? "Free"}</Text>
        </View>
        {data?.plan === "free" && (
          <TouchableOpacity onPress={() => router.push("/(app)/pricing")} style={{ backgroundColor: colors.text, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}>
            <Text style={{ color: colors.bg, fontSize: 12, fontWeight: "600" }}>Upgrade</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Expo Go'da test et**

```bash
npx expo start
```
Android cihazda Expo Go ile QR okut. Dashboard'ın açıldığını, stats gösterdiğini doğrula.

- [ ] **Commit**

```bash
git add app/(app)/index.tsx
git commit -m "feat: dashboard ekranı"
```

---

### Task 16: Karakter + Senaryo seçimi

**Files:**
- Create: `app/(app)/practice/index.tsx`
- Create: `components/CharacterCard.tsx`
- Create: `components/ScenarioItem.tsx`
- Copy: `data/characters.json` (web'den kopyala)

- [ ] **data/characters.json kopyala**

Web repo'daki `C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web\data\characters.json` dosyasını `data/characters.json` olarak kopyala.

- [ ] **components/CharacterCard.tsx**

```typescript
// components/CharacterCard.tsx
import { TouchableOpacity, View, Text, Image } from "react-native";
import { Lock } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface Character {
  id: string;
  name: string;
  role: string;
  photo?: string;
  color: string;
}

interface Props {
  character: Character;
  locked: boolean;
  onPress: () => void;
}

export default function CharacterCard({ character, locked, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={locked}
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        opacity: locked ? 0.5 : 1,
      }}
    >
      {character.photo
        ? <Image source={{ uri: character.photo }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 10 }} />
        : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: character.color, marginBottom: 10 }} />
      }
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>{character.name}</Text>
      <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>{character.role}</Text>
      {locked && (
        <View style={{ position: "absolute", top: 10, right: 10 }}>
          <Lock size={14} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );
}
```

- [ ] **app/(app)/practice/index.tsx**

```typescript
// app/(app)/practice/index.tsx
import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import CharacterCard from "@/components/CharacterCard";
import { useScenarios } from "@/hooks/useScenarios";
import { useAuthStore } from "@/stores/auth.store";
import { useSessionStore } from "@/stores/session.store";
import { canUseCharacter } from "@/lib/plan";
import { colors } from "@/constants/colors";
import characters from "@/data/characters.json";

export default function PracticeScreen() {
  const [step, setStep] = useState<"character" | "scenario">("character");
  const [customScenario, setCustomScenario] = useState("");
  const { data: scenarios, isLoading } = useScenarios();
  const userPlan = useAuthStore((s) => s.userPlan);
  const { setCharacter, setScenario, characterId } = useSessionStore();
  const router = useRouter();

  function selectCharacter(id: string) {
    if (!canUseCharacter(userPlan, id)) return;
    setCharacter(id);
    setStep("scenario");
  }

  function selectScenario(id: string | null, text: string | null) {
    setScenario(id, text);
    router.push("/(app)/practice/session");
  }

  if (step === "character") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 6 }}>Choose Character</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24 }}>Who would you like to practice with?</Text>
        <FlatList
          data={characters}
          numColumns={2}
          keyExtractor={(c) => c.id}
          columnWrapperStyle={{ gap: 12 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <CharacterCard
                character={item}
                locked={!canUseCharacter(userPlan, item.id)}
                onPress={() => selectCharacter(item.id)}
              />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: 60, paddingHorizontal: 20 }}>
      <TouchableOpacity onPress={() => setStep("character")} style={{ marginBottom: 16 }}>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>← Back</Text>
      </TouchableOpacity>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 6 }}>Choose Scenario</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 24 }}>Or start a free conversation</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Free conversation */}
        <TouchableOpacity
          onPress={() => selectScenario(null, null)}
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 }}
        >
          <Text style={{ color: colors.text, fontWeight: "600" }}>Free Conversation</Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>No specific scenario — just talk</Text>
        </TouchableOpacity>

        {isLoading && <ActivityIndicator color={colors.text} style={{ marginTop: 20 }} />}

        {scenarios?.map((s) => (
          <TouchableOpacity
            key={s.id}
            onPress={() => selectScenario(s.id, s.title_en)}
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>{s.icon} {s.title_en}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>{s.description_en}</Text>
          </TouchableOpacity>
        ))}

        {/* Custom scenario */}
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 12, marginBottom: 8 }}>Custom scenario</Text>
        <TextInput
          value={customScenario}
          onChangeText={setCustomScenario}
          placeholder="Describe your scenario..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, color: colors.text, minHeight: 80, marginBottom: 10 }}
        />
        {customScenario.trim() && (
          <TouchableOpacity
            onPress={() => selectScenario(null, customScenario.trim())}
            style={{ backgroundColor: colors.text, borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 20 }}
          >
            <Text style={{ color: colors.bg, fontWeight: "600" }}>Start</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Expo Go'da test et** — karakter seçimi → senaryo seçimi akışı

- [ ] **Commit**

```bash
git add app/(app)/practice/index.tsx components/CharacterCard.tsx components/ScenarioItem.tsx data/
git commit -m "feat: karakter + senaryo seçim ekranları"
```

---

### Task 17: Aktif sohbet ekranı (streaming)

**Files:**
- Create: `app/(app)/practice/session.tsx`
- Create: `components/MessageBubble.tsx`
- Create: `components/MicButton.tsx`

- [ ] **components/MessageBubble.tsx**

```typescript
// components/MessageBubble.tsx
import { View, Text } from "react-native";
import { colors } from "@/constants/colors";

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function MessageBubble({ role, content, streaming }: Props) {
  const isUser = role === "user";
  return (
    <View style={{ alignItems: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <View style={{
        backgroundColor: isUser ? colors.text : colors.surface,
        borderRadius: 18,
        borderBottomRightRadius: isUser ? 4 : 18,
        borderBottomLeftRadius: isUser ? 18 : 4,
        padding: 12,
        maxWidth: "80%",
        borderWidth: isUser ? 0 : 1,
        borderColor: colors.border,
      }}>
        <Text style={{ color: isUser ? colors.bg : colors.text, fontSize: 14, lineHeight: 20 }}>
          {content}{streaming ? "▋" : ""}
        </Text>
      </View>
    </View>
  );
}
```

- [ ] **components/MicButton.tsx**

```typescript
// components/MicButton.tsx
import { TouchableOpacity, View } from "react-native";
import { Mic, Square } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface Props {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
}

export default function MicButton({ isRecording, onPress, disabled }: Props) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ alignItems: "center" }}>
      <View style={{
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: isRecording ? "#ef4444" : colors.text,
        justifyContent: "center",
        alignItems: "center",
        opacity: disabled ? 0.4 : 1,
      }}>
        {isRecording
          ? <Square size={28} color={colors.bg} fill={colors.bg} />
          : <Mic size={28} color={colors.bg} />
        }
      </View>
    </TouchableOpacity>
  );
}
```

- [ ] **app/(app)/practice/session.tsx**

```typescript
// app/(app)/practice/session.tsx
import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ExpoSpeechRecognitionModule as Speech } from "expo-speech-recognition";
import { Audio } from "expo-av";
import MessageBubble from "@/components/MessageBubble";
import MicButton from "@/components/MicButton";
import { useSessionStore } from "@/stores/session.store";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE } from "@/constants/api";
import { colors } from "@/constants/colors";

export default function SessionScreen() {
  const { characterId, scenarioText, sessionId, messages, addMessage, startSession, setRecording, isRecording, reset } = useSessionStore();
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // Session başlatıcı
  useEffect(() => {
    if (!isInitialized && characterId) {
      initSession();
      setIsInitialized(true);
    }
    return () => { soundRef.current?.unloadAsync(); };
  }, []);

  async function streamChat(userMessage: string | null, isInitial: boolean) {
    setIsStreaming(true);
    setStreamingText("");

    try {
      const body: Record<string, unknown> = {
        characterId,
        scenario: scenarioText,
        messages: messages,
        isInitial,
      };
      if (!isInitial && sessionId) body.sessionId = sessionId;
      if (userMessage) addMessage({ role: "user", content: userMessage });

      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        if (err.error === "SESSION_LIMIT") { Alert.alert("Session Limit", "You've reached your daily session limit."); router.back(); return; }
        throw new Error(err.error);
      }

      // sessionId'yi header'dan al (isInitial'da)
      const newSessionId = res.headers.get("x-session-id");
      if (isInitial && newSessionId) startSession(newSessionId);

      // Stream oku
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        setStreamingText(full);
        scrollRef.current?.scrollToEnd({ animated: true });
      }

      setStreamingText("");
      addMessage({ role: "assistant", content: full });

      // TTS
      await playTts(full);
    } catch (e) {
      console.error("Stream error:", e);
    } finally {
      setIsStreaming(false);
    }
  }

  async function initSession() {
    await streamChat(null, true);
  }

  async function playTts(text: string) {
    try {
      const res = await fetch(`${API_BASE}/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ text, characterId }),
      });
      if (!res.ok) return;

      // React Native'de URL.createObjectURL yok — arraybuffer'ı base64'e çevir
      const arrayBuffer = await res.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      const uri = `data:audio/mpeg;base64,${base64}`;

      if (soundRef.current) await soundRef.current.unloadAsync();
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      await sound.playAsync();
    } catch { /* TTS hatası sessizce yoksay */ }
  }

  async function handleMicPress() {
    if (isRecording) {
      Speech.ExpoSpeechRecognitionModule.stop();
      setRecording(false);
      return;
    }

    const { granted } = await Speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) { Alert.alert("Permission", "Microphone permission required"); return; }

    setRecording(true);

    // expo-speech-recognition event tabanlı API kullanır
    const resultSub = Speech.ExpoSpeechRecognitionModule.addListener("result", (event) => {
      if (event.isFinal) {
        const text = event.results[0]?.transcript;
        setRecording(false);
        resultSub.remove();
        errorSub.remove();
        if (text) streamChat(text, false);
      }
    });

    const errorSub = Speech.ExpoSpeechRecognitionModule.addListener("error", () => {
      setRecording(false);
      resultSub.remove();
      errorSub.remove();
    });

    Speech.ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: false });
  }

  async function handleSend() {
    const text = textInput.trim();
    if (!text || isStreaming) return;
    setTextInput("");
    await streamChat(text, false);
  }

  function handleEnd() {
    reset();
    router.back();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ color: colors.text, fontWeight: "600", textTransform: "capitalize" }}>{characterId}</Text>
        <TouchableOpacity onPress={handleEnd}>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>End</Text>
        </TouchableOpacity>
      </View>

      {/* Mesajlar */}
      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {!isInitialized && <ActivityIndicator color={colors.text} style={{ marginTop: 40 }} />}
        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}
        {streamingText && <MessageBubble role="assistant" content={streamingText} streaming />}
      </ScrollView>

      {/* Input */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <TextInput
            value={textInput}
            onChangeText={setTextInput}
            placeholder="Type a message..."
            placeholderTextColor={colors.textMuted}
            style={{ flex: 1, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 14 }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity onPress={handleSend} disabled={!textInput.trim() || isStreaming} style={{ backgroundColor: colors.text, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, opacity: !textInput.trim() || isStreaming ? 0.4 : 1 }}>
            <Text style={{ color: colors.bg, fontWeight: "600", fontSize: 13 }}>Send</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center" }}>
          <MicButton isRecording={isRecording} onPress={handleMicPress} disabled={isStreaming} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Expo Go'da test et**

Karakter seç → senaryo seç → session ekranı açılır → karakter mesaj yazar (streaming) → TTS duyulur → mikrofon butonu ile konuş → yanıt gelir.

- [ ] **Commit**

```bash
git add app/(app)/practice/session.tsx components/MessageBubble.tsx components/MicButton.tsx
git commit -m "feat: aktif sohbet ekranı — streaming chat, STT, TTS"
```

---

### Task 18: Onboarding ekranı

**Files:**
- Create: `app/onboarding.tsx`

- [ ] **app/onboarding.tsx**

```typescript
// app/onboarding.tsx
import { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { apiJson } from "@/lib/api";
import { colors } from "@/constants/colors";

const QUESTIONS = [
  {
    id: "level",
    question: "What's your English level?",
    options: ["Beginner", "Elementary", "Intermediate", "Upper-Intermediate", "Advanced"],
  },
  {
    id: "goal",
    question: "What's your main goal?",
    options: ["Job interviews", "Daily conversation", "Business English", "Travel", "Academic"],
  },
  {
    id: "native_language",
    question: "What's your native language?",
    options: ["Turkish", "Arabic", "Spanish", "French", "German", "Other"],
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSelect(value: string) {
    const question = QUESTIONS[step];
    const newAnswers = { ...answers, [question.id]: value.toLowerCase() };
    setAnswers(newAnswers);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    try {
      await apiJson("/api/profile/onboarding", {
        method: "POST",
        body: JSON.stringify(newAnswers),
      });
      router.replace("/(app)");
    } catch {
      router.replace("/(app)");
    } finally {
      setLoading(false);
    }
  }

  const q = QUESTIONS[step];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, justifyContent: "center" }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 8 }}>
        {step + 1} / {QUESTIONS.length}
      </Text>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 32 }}>
        {q.question}
      </Text>

      {loading
        ? <ActivityIndicator color={colors.text} />
        : q.options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => handleSelect(opt)}
            style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10 }}
          >
            <Text style={{ color: colors.text, fontWeight: "500" }}>{opt}</Text>
          </TouchableOpacity>
        ))
      }
    </View>
  );
}
```

**Not:** `/api/profile/onboarding` endpoint'i web'de mevcut olmalı. Yoksa Task 18b olarak ekle. Mevcut web onboarding flow'unu kontrol et.

- [ ] **Web'de onboarding endpoint'ini kontrol et**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-web
ls app/api/profile/
```

Yoksa şunu ekle:
```bash
# app/api/profile/onboarding/route.ts
```
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { level, goal, native_language } = await req.json();
  await supabaseAdmin.from("profiles").update({ level, goal, native_language }).eq("id", userId);
  return NextResponse.json({ success: true });
}
```

- [ ] **Commit (mobil repo)**

```bash
cd C:\Users\halil\OneDrive\Desktop\ai\olalabs\olalabs-mobile
git add app/onboarding.tsx
git commit -m "feat: onboarding ekranı"
```

---

### Task 19: Pricing + Profile ekranları

**Files:**
- Create: `app/(app)/pricing.tsx`
- Create: `app/(app)/profile.tsx`

- [ ] **app/(app)/pricing.tsx**

```typescript
// app/(app)/pricing.tsx
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { useAuthStore } from "@/stores/auth.store";
import { apiJson } from "@/lib/api";
import { colors } from "@/constants/colors";

const PLANS = [
  { id: "free", name: "Free", price: "$0", features: ["3 sessions/day", "5 min/session", "2 characters", "Basic practice"] },
  { id: "pro", name: "Pro", price: "$9/mo", features: ["10 sessions/day", "20 min/session", "All 6 characters", "Analysis"] },
  { id: "premium", name: "Premium", price: "$19/mo", features: ["Unlimited sessions", "Unlimited time", "All characters", "Analysis + Progress charts"] },
] as const;

export default function PricingScreen() {
  const userPlan = useAuthStore((s) => s.userPlan);

  async function handleUpgrade(plan: "pro" | "premium") {
    try {
      const data = await apiJson<{ url: string }>("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ plan }),
      });
      if (data.url) Linking.openURL(data.url);
    } catch (e) {
      console.error("Checkout error:", e);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 4 }}>Plans</Text>
      <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 28 }}>Choose the plan that fits your goals</Text>

      {PLANS.map((plan) => {
        const isCurrent = userPlan === plan.id;
        return (
          <View key={plan.id} style={{ backgroundColor: colors.surface, borderColor: isCurrent ? "rgba(255,255,255,0.3)" : colors.border, borderWidth: 1, borderRadius: 20, padding: 20, marginBottom: 14 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>{plan.name}</Text>
              {isCurrent && <View style={{ backgroundColor: colors.border, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: colors.textMuted, fontSize: 11 }}>Current</Text></View>}
            </View>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 14 }}>{plan.price}</Text>
            {plan.features.map((f) => (
              <Text key={f} style={{ color: colors.textMuted, fontSize: 13, marginBottom: 5 }}>• {f}</Text>
            ))}
            {!isCurrent && plan.id !== "free" && (
              <TouchableOpacity
                onPress={() => handleUpgrade(plan.id)}
                style={{ backgroundColor: colors.text, borderRadius: 12, padding: 12, alignItems: "center", marginTop: 14 }}
              >
                <Text style={{ color: colors.bg, fontWeight: "600" }}>Upgrade to {plan.name}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
```

- [ ] **app/(app)/profile.tsx**

```typescript
// app/(app)/profile.tsx
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";
import { useProfile } from "@/hooks/useProfile";
import { colors } from "@/constants/colors";

export default function ProfileScreen() {
  const { logout, userPlan } = useAuthStore();
  const { data: profile } = useProfile();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const rows = [
    { label: "Plan", value: userPlan.charAt(0).toUpperCase() + userPlan.slice(1) },
    { label: "Native Language", value: profile?.nativeLanguage ?? "—" },
    { label: "Practice Language", value: profile?.practiceLanguage ?? "English" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 60 }}>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700", marginBottom: 28 }}>Profile</Text>

      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16, marginBottom: 20 }}>
        {rows.map((row, i) => (
          <View key={row.label} style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textMuted, fontSize: 14 }}>{row.label}</Text>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: "500", textTransform: "capitalize" }}>{row.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        onPress={handleLogout}
        style={{ backgroundColor: colors.surface, borderColor: "rgba(239,68,68,0.3)", borderWidth: 1, borderRadius: 14, padding: 15, alignItems: "center" }}
      >
        <Text style={{ color: "#ef4444", fontWeight: "600" }}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Expo Go'da test et** — tüm tablar çalışıyor mu kontrol et

- [ ] **Commit**

```bash
git add app/(app)/pricing.tsx app/(app)/profile.tsx
git commit -m "feat: pricing + profile ekranları"
```

---

## PHASE 6 — Build

---

### Task 20: EAS Build konfigürasyonu + APK

**Files:**
- Create: `eas.json`

- [ ] **EAS CLI yükle ve giriş yap**

```bash
npm install -g eas-cli
eas login
```
Expo hesabı yoksa `expo.dev`'de oluştur (ücretsiz).

- [ ] **EAS proje başlat**

```bash
eas init
```
Çıkacak olan project ID'yi `app.json`'a ekle: `"extra": { "eas": { "projectId": "xxx" } }`

- [ ] **eas.json oluştur**

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **APK build al**

```bash
eas build --platform android --profile preview
```
Build tamamlandığında link gelir, APK indir ve Android cihaza yükle.

- [ ] **APK'yı cihazda test et**

Tüm kritik akışları test et:
- [ ] Register → onboarding → dashboard
- [ ] Login / logout
- [ ] Karakter seç → senaryo seç → sohbet başlat
- [ ] Mikrofon ile konuş → yanıt gelir
- [ ] TTS duyulur
- [ ] Pricing ekranı açılır
- [ ] Profile → logout

- [ ] **Commit**

```bash
git add eas.json
git commit -m "chore: EAS Build konfigürasyonu"
```

---

## Dosya Haritası (özet)

### Web repo değişiklikleri
| Dosya | Değişiklik |
|-------|-----------|
| `lib/auth-server.ts` | Bearer header desteği |
| `app/api/auth/login/route.ts` | Token JSON body'de |
| `app/api/auth/register/route.ts` | Token JSON body'de |
| `app/api/auth/google/callback-mobile/route.ts` | YENİ |
| `app/api/auth/refresh/route.ts` | YENİ |
| `app/api/dashboard/route.ts` | YENİ |
| `app/api/chat/stream/route.ts` | YENİ |
| `app/api/profile/onboarding/route.ts` | YENİ (gerekiyorsa) |

### Mobil repo (yeni)
```
olalabs-mobile/
  app/_layout.tsx, (auth)/*, (app)/*, onboarding.tsx
  lib/api.ts, plan.ts, db-types.ts
  stores/auth.store.ts, session.store.ts
  hooks/useProfile.ts, useDashboard.ts, useScenarios.ts
  components/CharacterCard.tsx, MessageBubble.tsx, MicButton.tsx, GoogleAuthButton.tsx
  constants/colors.ts, api.ts
  data/characters.json
  eas.json, app.json, tailwind.config.js
```
