// app/(auth)/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { GoogleButton } from "@/components/GoogleButton";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const ERROR_MESSAGES: Record<string, string> = {
    session_failed: "Google sign-in failed. Please try again or use email/password.",
    token_failed: "Google authentication failed. Please try again.",
    user_creation_failed: "Could not create your account. Please try again.",
    cancelled: "Google sign-in was cancelled.",
    google_not_configured: "Google sign-in is not available right now.",
  };
  const [error, setError] = useState(urlError ? (ERROR_MESSAGES[urlError] ?? "An error occurred.") : "");

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
      window.location.href = redirect;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-[#111] border border-white/8 p-8">
      <h2 className="text-white text-xl font-semibold mb-6">Sign in to your account</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <GoogleButton />

      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/30 text-xs">or</span>
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
  );
}

export default function LoginPage() {
  return (
    <div className="bg-[#080808] flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-3xl tracking-tight">OLA</Link>
          <p className="text-white/60 text-sm mt-2">Welcome back</p>
        </div>
        <Suspense fallback={<div className="rounded-2xl bg-[#111] border border-white/8 p-8 text-white/50 text-center text-sm">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
