"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";

interface Scenario {
  slug: string;
  category: string;
  icon: string;
  title_en: string;
  description_en: string;
  min_plan: string;
  locked: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  travel: "Travel", work: "Work", daily: "Daily Life",
  education: "Education", social: "Social",
};

export default function ScenarioSelector({ onSelect }: { onSelect: (text: string) => void }) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customText, setCustomText] = useState("");
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((r) => r.json())
      .then((d) => { setScenarios(d.scenarios ?? []); setLoading(false); });
  }, []);

  const categories = [...new Set(scenarios.map((s) => s.category))];

  if (loading) return <div className="text-white/40 text-sm text-center py-8">Loading scenarios...</div>;

  if (showCustom) return (
    <div className="space-y-4">
      <button onClick={() => setShowCustom(false)} className="text-white/40 text-sm hover:text-white/60">← Back to scenarios</button>
      <label className="block text-white/80 text-sm font-medium">Describe your scenario</label>
      <textarea
        value={customText}
        onChange={(e) => setCustomText(e.target.value)}
        placeholder={`e.g. "I'm going for a US visa interview" or "I want to order food at a café"`}
        rows={3}
        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-400/60 transition-colors text-sm resize-none"
        autoFocus
      />
      <button
        onClick={() => onSelect(customText.trim())}
        disabled={!customText.trim()}
        className="w-full bg-white text-gray-900 font-semibold py-3 rounded-xl disabled:opacity-40 hover:bg-white/90 transition-colors text-sm"
      >
        Start practicing →
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      {showUpgrade && <UpgradeModal reason="locked_scenario" onClose={() => setShowUpgrade(false)} />}

      {categories.map((cat) => (
        <div key={cat}>
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            {CATEGORY_LABELS[cat] ?? cat}
          </div>
          <div className="flex flex-col gap-2">
            {scenarios.filter((s) => s.category === cat).map((s) => (
              <button key={s.slug}
                onClick={() => s.locked ? setShowUpgrade(true) : onSelect(`${s.title_en}: ${s.description_en}`)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl border text-left transition-all ${
                  s.locked
                    ? "border-white/5 bg-white/3 opacity-50"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <span className="text-2xl">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{s.title_en}</div>
                  <div className="text-white/40 text-xs truncate">{s.description_en}</div>
                </div>
                {s.locked && <Lock size={14} className="text-white/30 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={() => setShowCustom(true)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-white/20 text-white/50 hover:text-white/80 hover:border-white/40 transition-all text-sm"
      >
        <span className="text-lg">✏️</span>
        <span>Custom scenario...</span>
      </button>
    </div>
  );
}
