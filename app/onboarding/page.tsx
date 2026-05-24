"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NATIVE_LANGUAGES, PRACTICE_LANGUAGES } from "@/lib/languages";

type Step = "native" | "practice" | "quiz" | "level" | "goal";
const STEPS: Step[] = ["native", "practice", "quiz", "level", "goal"];

const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const GOALS  = ["travel", "work", "casual", "exam"] as const;
const LEVEL_LABELS: Record<string, string> = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
const GOAL_LABELS:  Record<string, string> = { travel: "✈️ Travel", work: "💼 Work", casual: "💬 Casual", exam: "📚 Exam" };

const QUIZ_QUESTIONS = [
  {
    question: "Choose the correct sentence:",
    options: [
      "I have went to London last year.",
      "I went to London last year.",
      "I have been to London several times.",
    ],
    points: [0, 1, 2],
  },
  {
    question: "What does 'under the weather' mean?",
    options: [
      "Standing in the rain",
      "Feeling slightly ill",
      "Being outside",
    ],
    points: [0, 2, 0],
  },
  {
    question: "Complete: 'If I ___ more time, I would learn another language.'",
    options: ["have", "had", "has"],
    points: [0, 2, 0],
  },
];

function scoreToLevel(score: number): string {
  if (score <= 1) return "beginner";
  if (score <= 4) return "intermediate";
  return "advanced";
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("native");
  const [nativeLang, setNativeLang]     = useState("");
  const [practiceLang, setPracticeLang] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal]   = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [, setSuggestedLevel] = useState<string>("");

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
    <div className="bg-[#080808] min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
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

        <div className="rounded-2xl bg-[#111] border border-white/8 p-8">

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
                    onClick={() => { if (lang.available) { setPracticeLang(lang.code); setStep("quiz"); } }}
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

          {step === "quiz" && (() => {
            const qIndex = quizAnswers.length;
            if (qIndex >= QUIZ_QUESTIONS.length) {
              const totalScore = quizAnswers.reduce((a, b) => a + b, 0);
              const detected = scoreToLevel(totalScore);
              return (
                <>
                  <h2 className="text-white font-semibold text-lg mb-1">We detected your level</h2>
                  <p className="text-white/50 text-sm mb-6">Based on your answers</p>
                  <div className="rounded-xl bg-white/8 border border-white/12 p-5 text-center mb-4">
                    <p className="text-white/50 text-xs uppercase tracking-widest mb-1">Suggested level</p>
                    <p className="text-white text-2xl font-bold capitalize">{detected}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { setLevel(detected); setSuggestedLevel(detected); setStep("goal"); }}
                      className="w-full px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
                    >
                      Yes, that's right →
                    </button>
                    <button
                      onClick={() => { setSuggestedLevel(detected); setStep("level"); }}
                      className="w-full px-5 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition-all"
                    >
                      Let me choose manually
                    </button>
                  </div>
                  <button onClick={() => { setQuizAnswers([]); setStep("practice"); }} className="mt-4 text-white/40 text-xs hover:text-white/60 block text-center w-full">← Back</button>
                </>
              );
            }

            const q = QUIZ_QUESTIONS[qIndex];
            return (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-white/30 text-xs">Question {qIndex + 1} of {QUIZ_QUESTIONS.length}</span>
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-white/20 text-xs">Quick level check</span>
                </div>
                <h2 className="text-white font-semibold text-base mb-5">{q.question}</h2>
                <div className="flex flex-col gap-2">
                  {q.options.map((opt, i) => (
                    <button key={i}
                      onClick={() => setQuizAnswers([...quizAnswers, q.points[i]])}
                      className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-sm text-left transition-all"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <button onClick={() => { setQuizAnswers([]); setStep("practice"); }} className="mt-4 text-white/40 text-xs hover:text-white/60 block text-center w-full">← Back</button>
              </>
            );
          })()}

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
              <button onClick={() => setStep("quiz")} className="mt-4 text-white/40 text-xs hover:text-white/60">← Back</button>
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
