"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NATIVE_LANGUAGES, PRACTICE_LANGUAGES } from "@/lib/languages";

type Step = "native" | "practice" | "goal";
const STEPS: Step[] = ["native", "practice", "goal"];

const GOALS  = ["travel", "work", "casual", "exam"] as const;
const GOAL_LABELS: Record<string, string> = { travel: "✈️ Travel", work: "💼 Work", casual: "💬 Casual", exam: "📚 Exam" };

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("native");
  const [nativeLang, setNativeLang]     = useState("");
  const [practiceLang, setPracticeLang] = useState("");
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
        body: JSON.stringify({ native_language: nativeLang, practice_language: practiceLang, goal }),
      });
      if (!res.ok) throw new Error("Failed");
      router.push("/dashboard");
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  return (
    <div className="bg-[#080808] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to OlaLabs</h1>
          <p className="text-white/60 text-sm">Quick setup — takes 30 seconds</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className={`w-2 h-2 rounded-full transition-colors ${i <= stepIndex ? "bg-white" : "bg-white/20"}`} />
          ))}
        </div>

        <div className="rounded-2xl bg-[#111] border border-white/8 p-8">

          {step === "native" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">What&apos;s your native language?</h2>
              <p className="text-white/50 text-sm mb-6">We&apos;ll use this for explanations and corrections</p>
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
                    onClick={() => { if (lang.available) { setPracticeLang(lang.code); setStep("goal"); } }}
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

          {step === "goal" && (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">What&apos;s your main goal?</h2>
              <p className="text-white/50 text-sm mb-6">This helps us pick the best conversations</p>
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
              <button onClick={() => setStep("practice")} className="mt-3 text-white/40 text-xs hover:text-white/60 block w-full text-center">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
