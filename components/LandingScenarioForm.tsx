"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function LandingScenarioForm({ value, onChange }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const charCount = value.length;
  const isValid = charCount >= 20 && charCount <= 500;

  const handleStart = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      // Auth kontrolü
      const me = await fetch("/api/auth/me").then(r => r.json());
      if (!me.loggedIn) {
        router.push(`/login?redirect=/dashboard`);
        return;
      }
      // Persona üret
      const res = await fetch("/api/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: value }),
      });
      if (!res.ok) throw new Error("Failed");
      const { character } = await res.json();
      const encoded = encodeURIComponent(JSON.stringify(character));
      router.push(`/practice?scenarioMode=true&scenarioCharacter=${encoded}`);
    } catch {
      setError("Could not generate character. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Describe your scenario... (e.g. I'm negotiating a salary raise with my manager.)"
        maxLength={500}
        rows={4}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-white/25 transition-colors"
      />
      <div className="flex items-center justify-between">
        <span className={`text-xs ${charCount < 20 ? "text-white/30" : charCount > 450 ? "text-amber-400/70" : "text-white/30"}`}>
          {charCount}/500 {charCount < 20 && charCount > 0 && `(${20 - charCount} more)`}
        </span>
        <button
          onClick={handleStart}
          disabled={!isValid || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f5c518] text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#f5c518]/90 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {loading ? "Creating..." : "Start Conversation"}
        </button>
      </div>
      {error && <p className="text-red-400/80 text-xs">{error}</p>}
    </div>
  );
}
