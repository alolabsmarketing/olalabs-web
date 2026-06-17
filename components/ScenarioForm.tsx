"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";

interface GeneratedCharacter {
  name: string;
  role: string;
  personality: string;
  systemPrompt: string;
}

interface Props {
  plan: string;
}

export default function ScenarioForm({ plan }: Props) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const isFree = plan === "free";
  const charCount = text.length;
  const isValid = charCount >= 20 && charCount <= 500;

  async function handleStart() {
    if (!isValid || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: text }),
      });

      const data = await res.json() as { character?: GeneratedCharacter; error?: string };

      if (!res.ok || !data.character) {
        setErrorMsg(data.error ?? "Could not generate character. Please try again.");
        setStatus("error");
        return;
      }

      const encoded = encodeURIComponent(JSON.stringify(data.character));
      router.push(`/practice?scenarioMode=true&scenarioCharacter=${encoded}`);
    } catch {
      setErrorMsg("Could not generate character. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl bg-white/3 border border-white/8 p-6">
        <div className="mb-5">
          <h2 className="text-white font-semibold text-base mb-1">Create Your Scenario</h2>
          <p className="text-white/40 text-sm">
            Describe a real-world situation you want to practice. Claude will create a matching character.
          </p>
        </div>

        {isFree && (
          <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20">
            <AlertCircle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs leading-relaxed">
              Free plan: 2-minute conversation. <a href="/dashboard#plans" className="underline hover:text-amber-300">Upgrade</a> for more.
            </p>
          </div>
        )}

        <div className="relative mb-4">
          <textarea
            value={text}
            onChange={(e) => {
              if (e.target.value.length <= 500) setText(e.target.value);
            }}
            placeholder="I'm applying for a software engineer job at a startup. The interviewer is tough but fair."
            rows={5}
            disabled={status === "loading"}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none focus:border-white/20 text-sm resize-none transition-colors disabled:opacity-50"
          />
          <span
            className={`absolute bottom-3 right-3 text-xs tabular-nums ${
              charCount > 500 ? "text-red-400" : charCount >= 20 ? "text-white/30" : "text-white/20"
            }`}
          >
            {charCount}/500
          </span>
        </div>

        {charCount > 0 && charCount < 20 && (
          <p className="text-white/30 text-xs mb-3 -mt-2 ml-1">
            {20 - charCount} more characters needed.
          </p>
        )}

        {status === "error" && (
          <div className="mb-4 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
            <p className="text-red-400/90 text-xs">{errorMsg}</p>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!isValid || status === "loading"}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {status === "loading" ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Creating your scenario character...
            </>
          ) : (
            <>
              <Sparkles size={15} />
              Start Conversation
            </>
          )}
        </button>
      </div>

      {/* Example prompts */}
      <div className="mt-5">
        <p className="text-white/25 text-xs mb-3 ml-1">Example scenarios</p>
        <div className="flex flex-col gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              disabled={status === "loading"}
              className="text-left px-4 py-2.5 rounded-xl bg-white/3 border border-white/6 text-white/40 text-xs hover:bg-white/5 hover:text-white/60 hover:border-white/10 transition-all disabled:opacity-40"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const EXAMPLES = [
  "I'm applying for a software engineer job at a startup. The interviewer is tough but fair.",
  "I need to negotiate a higher salary with my manager during my annual review.",
  "I'm at a doctor's appointment describing persistent back pain I've had for a few months.",
  "I'm checking in at a hotel and there's a problem with my reservation.",
];
