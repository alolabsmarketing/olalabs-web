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
  const [error, setError] = useState("");

  async function handleStart() {
    if (!level || !goal) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, goal }),
    });
    if (!res.ok) {
      setError("Kaydedilemedi, tekrar dene.");
      setLoading(false);
      return;
    }
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

          {error && (
            <p className="text-red-400 text-xs text-center mb-3">{error}</p>
          )}

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
