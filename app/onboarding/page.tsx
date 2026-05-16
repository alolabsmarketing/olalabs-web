"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { translations, type Lang } from "@/lib/i18n";

type Level = "beginner" | "intermediate" | "advanced";
type Goal = "travel" | "work" | "casual" | "exam";

const LEVEL_VALUES: Level[] = ["beginner", "intermediate", "advanced"];
const LEVEL_ICONS: Record<Level, string> = { beginner: "🌱", intermediate: "📈", advanced: "🚀" };

const GOAL_VALUES: Goal[] = ["travel", "work", "casual", "exam"];
const GOAL_ICONS: Record<Goal, string> = { travel: "✈️", work: "💼", casual: "💬", exam: "📚" };

export default function OnboardingPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Lang>("en");
  const [level, setLevel] = useState<Level | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const T = translations[language].onboarding;

  async function handleStart() {
    if (!level || !goal) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, goal, language }),
    });
    if (!res.ok) {
      setError(T.error);
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
            <h2 className="text-white text-xl font-bold">{T.title}</h2>
            <p className="text-white/50 text-sm mt-1">{T.subtitle}</p>
          </div>

          {/* Language selection — always bilingual */}
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            {T.selectLanguage}
          </p>
          <div className="grid grid-cols-2 gap-2 mb-6">
            {(["en", "tr"] as Lang[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  language === lang
                    ? "bg-blue-500/15 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{lang === "en" ? "🇺🇸" : "🇹🇷"}</span>
                {lang === "en" ? "English" : "Türkçe"}
              </button>
            ))}
          </div>

          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            {T.selectLevel}
          </p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {LEVEL_VALUES.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-sm font-medium transition-all ${
                  level === l
                    ? "bg-blue-500/15 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{LEVEL_ICONS[l]}</span>
                {T.levels[l]}
              </button>
            ))}
          </div>

          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-3">
            {T.selectGoal}
          </p>
          <div className="grid grid-cols-4 gap-2 mb-8">
            {GOAL_VALUES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-xs font-medium transition-all ${
                  goal === g
                    ? "bg-blue-500/15 border-blue-400 text-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-xl">{GOAL_ICONS[g]}</span>
                {T.goals[g]}
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
            {loading ? T.saving : T.start}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-center text-white/30 hover:text-white/50 text-sm transition-colors"
          >
            {T.skip}
          </button>
        </div>
      </div>
    </div>
  );
}
