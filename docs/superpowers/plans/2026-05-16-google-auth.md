# Google OAuth + Onboarding — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login ve register sayfalarına "Google ile devam et" butonu eklemek; yeni kullanıcılara seviye + hedef soran onboarding ekranı göstermek.

**Architecture:** Supabase OAuth (PKCE) akışı kullanılır. Client-side `signInWithOAuth` → Google → `/auth/callback` page → code exchange → `/api/auth/callback` POST ile httpOnly cookie set → yeni kullanıcıysa `/onboarding`, değilse `/dashboard`. Mevcut `sb-access-token` / `sb-refresh-token` cookie sistemi ve `proxy.ts` korunur.

**Tech Stack:** Next.js 16.2.4 App Router, @supabase/supabase-js v2, Tailwind CSS v4, TypeScript

---

## File Map

| Dosya | İşlem | Görev |
|---|---|---|
| `supabase/migrations/002_add_level_goal.sql` | Oluştur | profiles tablosuna level + goal kolonları |
| `app/api/auth/callback/route.ts` | Oluştur | POST: access_token + refresh_token → httpOnly cookie |
| `app/auth/callback/page.tsx` | Oluştur | Client: OAuth code exchange → API → yönlendirme |
| `components/GoogleButton.tsx` | Oluştur | Google OAuth buton bileşeni |
| `app/(auth)/login/page.tsx` | Değiştir | GoogleButton + "veya" ayracı ekle |
| `app/(auth)/register/page.tsx` | Değiştir | GoogleButton + "veya" ayracı ekle |
| `app/api/onboarding/route.ts` | Oluştur | PATCH: profiles.level + profiles.goal güncelle |
| `app/onboarding/page.tsx` | Oluştur | Seviye + hedef seçim UI |
| `proxy.ts` | Değiştir | `/onboarding` PROTECTED listesine ekle |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/002_add_level_goal.sql`

- [ ] **Step 1: Migration dosyasını oluştur**

```sql
-- supabase/migrations/002_add_level_goal.sql
alter table public.profiles
  add column if not exists level text check (level in ('beginner', 'intermediate', 'advanced')),
  add column if not exists goal  text check (goal  in ('travel', 'work', 'casual', 'exam'));
```

- [ ] **Step 2: Supabase Dashboard'da migration'ı çalıştır**

Supabase Dashboard → SQL Editor → yukarıdaki SQL'i yapıştır → Run.

Doğrulama: Table Editor → profiles → `level` ve `goal` kolonları NULL varsayılan olarak görünüyor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_add_level_goal.sql
git commit -m "feat(db): add level and goal columns to profiles"
```

---

## Task 2: Supabase + Google Cloud Konfigürasyonu (Manuel)

Bu task hiç kod içermez — implementasyona başlamadan önce tamamlanmalıdır.

- [ ] **Step 1: Google Cloud Console — OAuth Client oluştur**

1. https://console.cloud.google.com adresine git
2. Proje seç (yoksa yeni oluştur: "OlaLabs")
3. APIs & Services → Credentials → + Create Credentials → OAuth client ID
4. Application type: **Web application**
5. Authorized redirect URIs'e şunu ekle:
   ```
   https://<supabase-project-ref>.supabase.co/auth/v1/callback
   ```
   (Supabase Dashboard → Settings → API → Project URL ile proje ref'ini bul)
6. Kaydet → **Client ID** ve **Client Secret** kopyala

- [ ] **Step 2: Supabase Dashboard — Google provider etkinleştir**

1. Supabase Dashboard → Authentication → Providers → Google
2. Enable Google provider: **ON**
3. Client ID ve Client Secret'ı yapıştır
4. Authorized Redirect URL olarak şunu kaydet (Supabase bunu gösterir, Google Console'a ekledin mi kontrol et):
   ```
   https://<supabase-project-ref>.supabase.co/auth/v1/callback
   ```
5. Save

- [ ] **Step 3: Doğrula**

Supabase Dashboard → Authentication → Providers → Google → Status: **Enabled** görünüyor.

---

## Task 3: `/api/auth/callback` Route

**Files:**
- Create: `app/api/auth/callback/route.ts`

- [ ] **Step 1: Route dosyasını oluştur**

```typescript
// app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();

  if (!access_token || !refresh_token) {
    return NextResponse.json({ error: "Missing tokens" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });

  res.cookies.set("sb-access-token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  res.cookies.set("sb-refresh-token", refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return res;
}
```

- [ ] **Step 2: Manuel test**

```bash
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"access_token":"test","refresh_token":"test"}'
```

Beklenen: `{"success":true}` ve response header'larında `set-cookie` görünür.

- [ ] **Step 3: Commit**

```bash
git add app/api/auth/callback/route.ts
git commit -m "feat(auth): add callback route to set OAuth tokens as httpOnly cookies"
```

---

## Task 4: `/auth/callback` Sayfa Bileşeni

**Files:**
- Create: `app/auth/callback/page.tsx`

- [ ] **Step 1: Sayfa bileşenini oluştur**

```typescript
// app/auth/callback/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleCallback() {
      const code = searchParams.get("code");
      if (!code) {
        router.replace("/login?error=missing_code");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      const { access_token, refresh_token, user } = data.session;

      await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
      });

      // Yeni kullanıcı mı kontrol et (level IS NULL)
      const { data: profile } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();

      if (!profile?.level) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="ola-gradient-bg flex min-h-screen items-center justify-center">
      <div className="ola-wave" />
      <div className="relative z-10 text-center">
        <p className="text-white/60 text-sm animate-pulse">Giriş yapılıyor...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/callback/page.tsx
git commit -m "feat(auth): add OAuth callback page for code exchange and redirect"
```

---

## Task 5: `GoogleButton` Bileşeni

**Files:**
- Create: `components/GoogleButton.tsx`

- [ ] **Step 1: Bileşeni oluştur**

```typescript
// components/GoogleButton.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function GoogleButton() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={handleGoogleLogin}
      disabled={loading}
      className="w-full py-2.5 rounded-xl bg-white text-[#1a1a2e] font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 mb-5"
    >
      {loading ? (
        <span className="text-[#1a1a2e]/60">Yönlendiriliyor...</span>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" />
            <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.88v2.07A8 8 0 0 0 8.98 17z" />
            <path fill="#FBBC05" d="M4.51 10.52A4.8 4.8 0 0 1 4.26 9c0-.53.09-1.04.25-1.52V5.41H1.88A8 8 0 0 0 .98 9c0 1.29.31 2.51.9 3.59l2.63-2.07z" />
            <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 8.98 1a8 8 0 0 0-7.1 4.41l2.63 2.07c.63-1.89 2.39-3.3 4.47-3.3z" />
          </svg>
          Google ile devam et
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/GoogleButton.tsx
git commit -m "feat(ui): add GoogleButton component for OAuth sign-in"
```

---

## Task 6: Login Sayfasını Güncelle

**Files:**
- Modify: `app/(auth)/login/page.tsx`

- [ ] **Step 1: GoogleButton import ekle ve formu güncelle**

`app/(auth)/login/page.tsx` dosyasını tamamen aşağıdaki ile değiştir:

```typescript
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { GoogleButton } from "@/components/GoogleButton";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ola-gradient-bg relative flex min-h-screen items-center justify-center p-4">
      <div className="ola-wave" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-3xl tracking-tight">OLA</Link>
          <p className="text-white/60 text-sm mt-2">Welcome back</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <GoogleButton />

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">veya</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? "Signing in..." : <>Sign in <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Görsel kontrol**

Dev server'ı çalıştır (`npm run dev`), `http://localhost:3000/login` aç.
Beklenen: Google butonu üstte, "veya" ayracı, email/password formu altta.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "feat(auth): add Google sign-in button to login page"
```

---

## Task 7: Register Sayfasını Güncelle

**Files:**
- Modify: `app/(auth)/register/page.tsx`

- [ ] **Step 1: GoogleButton import ekle ve formu güncelle**

`app/(auth)/register/page.tsx` dosyasını tamamen aşağıdaki ile değiştir:

```typescript
// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { GoogleButton } from "@/components/GoogleButton";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      window.location.href = "/onboarding";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ola-gradient-bg relative flex min-h-screen items-center justify-center p-4">
      <div className="ola-wave" />
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-3xl tracking-tight">OLA</Link>
          <p className="text-white/60 text-sm mt-2">Start your language journey</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-white text-xl font-semibold mb-6">Create your account</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
              {error}
            </div>
          )}

          <GoogleButton />

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-xs">veya</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-1.5">Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-white/70 text-sm mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? "Creating account..." : <>Get started free <ArrowRight size={14} /></>}
            </button>
          </form>

          <p className="text-center text-white/50 text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              Sign in
            </Link>
          </p>

          <p className="text-center text-white/30 text-xs mt-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
```

Not: `window.location.href = "/onboarding"` olarak değiştirildi — yeni email kayıtları da onboarding'e yönlendirilir.

- [ ] **Step 2: Görsel kontrol**

`http://localhost:3000/register` aç.
Beklenen: Google butonu üstte, "veya" ayracı, form altta.

- [ ] **Step 3: Commit**

```bash
git add app/\(auth\)/register/page.tsx
git commit -m "feat(auth): add Google sign-in button to register page"
```

---

## Task 8: Onboarding API Route

**Files:**
- Create: `app/api/onboarding/route.ts`

- [ ] **Step 1: Route dosyasını oluştur**

```typescript
// app/api/onboarding/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function PATCH(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { level, goal } = await req.json();

  if (!level || !goal) {
    return NextResponse.json({ error: "level and goal are required" }, { status: 400 });
  }

  const validLevels = ["beginner", "intermediate", "advanced"];
  const validGoals = ["travel", "work", "casual", "exam"];

  if (!validLevels.includes(level) || !validGoals.includes(goal)) {
    return NextResponse.json({ error: "Invalid level or goal value" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ level, goal })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/onboarding/route.ts
git commit -m "feat(api): add onboarding route to save user level and goal"
```

---

## Task 9: Onboarding Sayfası

**Files:**
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Sayfayı oluştur**

```typescript
// app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Level = "beginner" | "intermediate" | "advanced";
type Goal = "travel" | "work" | "casual" | "exam";

const LEVELS: { value: Level; label: string; icon: string }[] = [
  { value: "beginner",     label: "Başlangıç", icon: "🌱" },
  { value: "intermediate", label: "Orta",       icon: "📈" },
  { value: "advanced",     label: "İleri",      icon: "🚀" },
];

const GOALS: { value: Goal; label: string; icon: string }[] = [
  { value: "travel",  label: "Seyahat", icon: "✈️" },
  { value: "work",    label: "İş",      icon: "💼" },
  { value: "casual",  label: "Günlük",  icon: "💬" },
  { value: "exam",    label: "Sınav",   icon: "📚" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [level, setLevel] = useState<Level | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (!level || !goal) return;
    setLoading(true);
    await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, goal }),
    });
    router.replace("/dashboard");
  }

  function handleSkip() {
    router.replace("/dashboard");
  }

  return (
    <div className="ola-gradient-bg relative flex min-h-screen items-center justify-center p-4">
      <div className="ola-wave" />
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">👋</div>
            <h2 className="text-white text-xl font-bold">Hoş geldin!</h2>
            <p className="text-white/50 text-sm mt-1">
              Sana özel deneyim için 2 kısa soru
            </p>
          </div>

          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            Seviyeni seç
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setLevel(l.value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                  level === l.value
                    ? "bg-blue-500/15 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{l.icon}</span>
                {l.label}
              </button>
            ))}
          </div>

          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            Hedefini seç
          </p>
          <div className="grid grid-cols-4 gap-2 mb-8">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs font-medium transition-all ${
                  goal === g.value
                    ? "bg-blue-500/15 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleStart}
            disabled={!level || !goal || loading}
            className="w-full py-2.5 rounded-xl bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-40 mb-3"
          >
            {loading ? "Kaydediliyor..." : "Başla →"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-white/30 hover:text-white/50 text-sm transition-colors"
          >
            Şimdilik atla
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Görsel + işlevsel test**

1. `npm run dev` çalıştır
2. `http://localhost:3000/onboarding` aç (giriş yapmış kullanıcıyla)
3. Seviye seç → seçili kart mavi kenarlık alıyor
4. Hedef seç → "Başla" butonu aktif oluyor
5. "Başla" tıkla → `/dashboard`'a yönleniyor
6. Supabase Dashboard → profiles → level ve goal kolonları dolmuş

- [ ] **Step 3: Commit**

```bash
git add app/onboarding/page.tsx
git commit -m "feat(onboarding): add level and goal selection page"
```

---

## Task 10: `proxy.ts` Güncelle

**Files:**
- Modify: `proxy.ts`

- [ ] **Step 1: `/onboarding` korumalı rotaya ekle**

`proxy.ts` içindeki `PROTECTED` dizisine `/onboarding` ekle:

```typescript
// proxy.ts
import { NextRequest, NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/practice", "/profile", "/characters", "/onboarding"];
const AUTH_ONLY = ["/login", "/register"];

export function proxy(req: NextRequest) {
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

- [ ] **Step 2: Test**

Giriş yapmadan `http://localhost:3000/onboarding` aç → `/login`'e yönleniyor.

- [ ] **Step 3: Commit**

```bash
git add proxy.ts
git commit -m "feat(auth): add /onboarding to protected routes"
```

---

## Uçtan Uca Test

- [ ] **Google OAuth tam akış**

1. Giriş yap butona tıkla → Google sayfasına yönleniyor
2. Google hesabıyla onay ver → `/auth/callback` sayfasında kısa "Giriş yapılıyor..." yazısı görünüyor
3. Yeni hesap ise → `/onboarding` açılıyor
4. Seviye + hedef seç, "Başla" tıkla → `/dashboard` açılıyor
5. Supabase Dashboard → profiles → level ve goal dolu

- [ ] **Mevcut Google kullanıcısı (tekrar giriş)**

Google ile giriş yap (zaten kayıtlı) → `/dashboard`'a direkt yönleniyor (onboarding'i atlar)

- [ ] **Email kayıt → onboarding**

Yeni email ile kayıt ol → `/onboarding`'e yönleniyor
Seviye + hedef seç → `/dashboard`

- [ ] **"Şimdilik atla"**

Onboarding'de "Şimdilik atla" tıkla → `/dashboard`
Supabase Dashboard → profiles → level NULL

- [ ] **Deploy**

```bash
git push origin master
```

Vercel otomatik deploy başlar. Production'da Google OAuth çalışıyor mu kontrol et.

---

## Self-Review

- [x] **Spec coverage:** DB migration ✓, Google config ✓, callback route ✓, callback page ✓, GoogleButton ✓, login update ✓, register update ✓, onboarding API ✓, onboarding page ✓, proxy update ✓
- [x] **Placeholder yok:** Tüm adımlarda tam kod var
- [x] **Tip tutarlılığı:** `Level` ve `Goal` tipleri Task 9'da tanımlandı, API Task 8'de aynı değerleri validate ediyor (`beginner/intermediate/advanced`, `travel/work/casual/exam`)
- [x] **Register → onboarding:** Task 7'de `window.location.href = "/onboarding"` olarak güncellendi — yeni email kayıtları da onboarding'e düşüyor
- [x] **`/auth/callback` proxy dışında:** `AUTH_ONLY` listesinde değil (giriş yapmış kullanıcı callback'e gelirse tokens'ı yenilemek istiyor olabilir, bloklamamak gerekir) ✓
