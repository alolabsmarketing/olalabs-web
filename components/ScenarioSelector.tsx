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

const SCENARIO_CONTEXTS: Record<string, string> = {
  // Travel
  "visa_interview": "Setting: US embassy visa interview window. You are the visa officer. The user is applying for a tourist visa. Ask about travel purpose, duration, finances, and ties to home country. Be professional but not intimidating.",
  "visa-interview": "Setting: US embassy visa interview window. You are the visa officer. The user is applying for a tourist visa. Ask about travel purpose, duration, finances, and ties to home country. Be professional but not intimidating.",
  "hotel_checkin": "Setting: hotel front desk. You are the receptionist. The user is checking in. Handle their reservation, answer questions about the hotel, deal with any issues that come up.",
  "hotel-checkin": "Setting: hotel front desk. You are the receptionist. The user is checking in. Handle their reservation, answer questions about the hotel, deal with any issues that come up.",
  "airport": "Setting: airport, various situations (check-in, security, gate, lost luggage). You are airline staff or airport personnel. The user is a traveler. Handle their situation naturally.",

  // Work
  "job_interview": "Setting: job interview at a company relevant to your profession. You are the interviewer (hiring manager or HR). The user is the candidate. Ask realistic interview questions, follow up on their answers, give natural reactions.",
  "job-interview": "Setting: job interview at a company relevant to your profession. You are the interviewer (hiring manager or HR). The user is the candidate. Ask realistic interview questions, follow up on their answers, give natural reactions.",
  "business_meeting": "Setting: a business meeting or client call. You are a colleague or client. The user is presenting or discussing a work topic. React as a real professional would — ask questions, push back when needed.",
  "business-meeting": "Setting: a business meeting or client call. You are a colleague or client. The user is presenting or discussing a work topic. React as a real professional would — ask questions, push back when needed.",
  "work_email": "Setting: workplace communication. You are a colleague or manager. The user is discussing or drafting professional communications. Give honest, direct feedback.",

  // Daily Life
  "restaurant": "Setting: a restaurant. You are the waiter/waitress. The user is a customer. Take their order, answer questions about the menu, handle special requests or complaints naturally.",
  "doctor_visit": "Setting: a doctor's office or clinic. You are the doctor or medical staff. The user is the patient. Ask about symptoms, give clear explanations, recommend next steps.",
  "doctor-visit": "Setting: a doctor's office or clinic. You are the doctor or medical staff. The user is the patient. Ask about symptoms, give clear explanations, recommend next steps.",
  "shopping": "Setting: a retail store or market. You are the shop assistant. The user is a customer. Help them find what they need, handle returns or complaints if needed.",
  "phone_call": "Setting: a phone call (customer service, booking, inquiry). You are on the other end of the line. The user called you. Handle their request professionally.",

  // Education
  "university_admission": "Setting: university admissions interview. You are the admissions officer. The user is applying. Ask about their background, motivations, and goals. Be thorough but fair.",
  "university-admission": "Setting: university admissions interview. You are the admissions officer. The user is applying. Ask about their background, motivations, and goals. Be thorough but fair.",
  "class_presentation": "Setting: classroom or academic setting. You are a professor or fellow student. The user is giving a presentation or discussing academic work. Engage with the content seriously.",

  // Social
  "making_friends": "Setting: a social situation (party, club, event). You are meeting the user for the first time. Have a natural getting-to-know-you conversation. Be warm but real — not a forced networking interaction.",
  "small_talk": "Setting: casual social encounter (waiting room, elevator, coffee queue). You and the user have just met. Keep conversation light but genuine.",
  "date": "Setting: a first date at a café. You are the person the user is meeting. Have a natural first-date conversation — curious, warm, honest.",
};

function buildScenarioContext(scenario: Scenario): string {
  const ctx = SCENARIO_CONTEXTS[scenario.slug];
  if (ctx) return `${scenario.title_en} — ${ctx}`;
  return `${scenario.title_en}: ${scenario.description_en}. Enter this scenario naturally and take the appropriate role.`;
}

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
                onClick={() => s.locked ? setShowUpgrade(true) : onSelect(buildScenarioContext(s))}
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
                  {!s.locked && SCENARIO_CONTEXTS[s.slug] && (
                    <div className="text-white/20 text-xs mt-1 truncate">
                      {SCENARIO_CONTEXTS[s.slug].split('.')[0]}
                    </div>
                  )}
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
