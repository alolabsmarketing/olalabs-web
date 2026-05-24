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
      window.location.href = data.redirectTo ?? "/onboarding";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#080808] flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-white font-bold text-3xl tracking-tight">OLA</Link>
          <p className="text-white/60 text-sm mt-2">Start your language journey</p>
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/8 p-8">
          <h2 className="text-white text-xl font-semibold mb-6">Create your account</h2>

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

