"use client";
import { useState } from "react";
import { X, Zap, Star } from "lucide-react";

export type UpgradeReason =
  | "voice_limit" | "locked_character" | "locked_scenario" | "analysis";

const COPY: Record<UpgradeReason, { title: string; subtitle: string }> = {
  voice_limit:      { title: "Daily voice limit reached",    subtitle: "You've used your 5 minutes of free voice practice today. Upgrade for unlimited practice." },
  locked_character: { title: "Character locked",            subtitle: "This character is available on Pro and above." },
  locked_scenario:  { title: "Scenario locked",             subtitle: "This scenario is available on Pro and above." },
  analysis:         { title: "Analysis is a Pro feature",    subtitle: "Get detailed feedback on grammar, vocabulary, and fluency." },
};

export default function UpgradeModal({ reason, onClose }: { reason: UpgradeReason; onClose: () => void }) {
  const [loading, setLoading] = useState<"pro" | "premium" | null>(null);
  const { title, subtitle } = COPY[reason];

  async function upgrade(plan: "pro" | "premium") {
    setLoading(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1f3a] border border-white/20 rounded-2xl p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white"><X size={20} /></button>
        <div className="text-center mb-6">
          <h2 className="text-white font-bold text-xl mb-2">{title}</h2>
          <p className="text-white/60 text-sm">{subtitle}</p>
        </div>
        <div className="space-y-3">
          <button onClick={() => upgrade("pro")} disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors disabled:opacity-60">
            <div className="text-left">
              <div className="text-white font-semibold flex items-center gap-2"><Zap size={16} /> Pro</div>
              <div className="text-indigo-200 text-xs">Unlimited practice · All characters · Analysis</div>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">$4.50<span className="text-indigo-300 text-xs font-normal">/mo</span></div>
              <div className="text-indigo-300/60 text-xs line-through">$9/mo</div>
            </div>
          </button>
          <button onClick={() => upgrade("premium")} disabled={loading !== null}
            className="w-full flex items-center justify-between px-5 py-4 bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 rounded-xl transition-colors disabled:opacity-60">
            <div className="text-left">
              <div className="text-amber-400 font-semibold flex items-center gap-2"><Star size={16} /> Premium</div>
              <div className="text-amber-200/60 text-xs">Unlimited everything · Progress charts</div>
            </div>
            <div className="text-right">
              <div className="text-amber-400 font-bold">$9.50<span className="text-amber-400/60 text-xs font-normal">/mo</span></div>
              <div className="text-amber-300/40 text-xs line-through">$19/mo</div>
            </div>
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full text-white/30 text-xs hover:text-white/50 py-2">Maybe later</button>
      </div>
    </div>
  );
}
