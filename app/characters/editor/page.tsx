"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { type Character } from "@/lib/characters";
import CharacterAvatar from "@/components/CharacterAvatar";
import { cn } from "@/lib/utils";

const RESPONSE_LENGTH_LABELS = {
  very_short: "Very short (1-2 sentences)",
  short: "Short (2-3 sentences)",
  medium: "Medium (3-5 sentences)",
  long: "Long (5+ sentences)",
};

const FORMALITY_LABELS = {
  casual: "Casual",
  semi_formal: "Semi-formal",
  formal: "Formal",
};

const CORRECTION_LABELS = {
  never: "Never corrects",
  inline: "Corrects inline (mid-response)",
  end_of_message: "Corrects at end of response",
};

export default function CharacterEditorPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selected, setSelected] = useState<string>("emma");
  const [draft, setDraft] = useState<Character | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string>("basic");

  useEffect(() => {
    fetch("/api/characters")
      .then((r) => r.json())
      .then((data) => {
        setCharacters(data);
        setDraft(data.find((c: Character) => c.id === "emma") ?? null);
      });
  }, []);

  function selectCharacter(id: string) {
    setSelected(id);
    setDraft(characters.find((c) => c.id === id) ?? null);
    setSaved(false);
  }

  function update(path: string, value: unknown) {
    if (!draft) return;
    const keys = path.split(".");
    const updated = structuredClone(draft);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let obj: any = updated;
    for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
    obj[keys[keys.length - 1]] = value;
    setDraft(updated);
    setSaved(false);
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await fetch("/api/characters", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draft.id, updates: draft }),
      });
      setCharacters((prev) => prev.map((c) => (c.id === draft.id ? draft : c)));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    const original = characters.find((c) => c.id === selected);
    if (original) { setDraft(structuredClone(original)); setSaved(false); }
  }

  if (!draft) return (
    <div className="ola-gradient-bg flex items-center justify-center min-h-screen">
      <p className="text-white/50 text-sm">Loading characters...</p>
    </div>
  );

  const section = (id: string, label: string, children: React.ReactNode) => (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpandedSection(expandedSection === id ? "" : id)}
        className="w-full flex items-center justify-between px-5 py-4 text-white font-semibold text-sm hover:bg-white/5 transition-colors"
      >
        {label}
        {expandedSection === id ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
      </button>
      {expandedSection === id && <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">{children}</div>}
    </div>
  );

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder?: string) => (
    <div>
      <label className="block text-white/60 text-xs mb-1.5">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-colors"
      />
    </div>
  );

  const select = (label: string, value: string, options: Record<string, string>, onChange: (v: string) => void) => (
    <div>
      <label className="block text-white/60 text-xs mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0d2060] border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50 transition-colors"
      >
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );

  const toggle = (label: string, desc: string, value: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-white/80 text-sm">{label}</p>
        <p className="text-white/40 text-xs mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          "w-11 h-6 rounded-full transition-all flex-shrink-0 relative mt-0.5",
          value ? "bg-blue-500" : "bg-white/20"
        )}
      >
        <span className={cn(
          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all",
          value ? "left-5" : "left-0.5"
        )} />
      </button>
    </div>
  );

  const slider = (label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void) => (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-white/60 text-xs">{label}</label>
        <span className="text-white/60 text-xs font-mono">{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-blue-400"
      />
    </div>
  );

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-white font-bold text-xl">Character Editor</h1>
              <p className="text-white/40 text-xs mt-0.5">Configure personality, style, and voice for each AI character</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={reset} className="flex items-center gap-1.5 px-4 py-2 rounded-xl glass-pill text-white/60 hover:text-white text-sm transition-all">
              <RotateCcw size={13} /> Reset
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all",
                saved ? "bg-green-500/20 border border-green-500/40 text-green-400" : "bg-white text-[#07112b] hover:bg-white/90"
              )}
            >
              <Save size={13} />
              {saving ? "Saving..." : saved ? "Saved!" : "Save changes"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[220px_1fr] gap-6">

          {/* Character list sidebar */}
          <div className="space-y-2">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => selectCharacter(char.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left",
                  selected === char.id ? "bg-white/15 border border-white/25" : "glass-card hover:bg-white/8"
                )}
              >
                <CharacterAvatar characterId={char.id} size="sm" />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate">{char.name}</p>
                  <p className="text-white/40 text-xs truncate">{char.role}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Editor panels */}
          <div className="space-y-3">

            {/* Preview header */}
            <div className="glass-card p-5 flex items-center gap-4">
              <div
                className="rounded-full p-1"
                style={{ background: `linear-gradient(135deg, ${draft.color}60, ${draft.color}20)` }}
              >
                <CharacterAvatar characterId={draft.id} size="md" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{draft.name}</p>
                <p style={{ color: draft.color }} className="text-sm">{draft.role}</p>
                <p className="text-white/40 text-xs mt-0.5">{draft.profession}</p>
              </div>
              <Link
                href={`/practice?character=${draft.id}&auto=true`}
                className="ml-auto glass-pill px-4 py-2 text-white text-sm hover:bg-white/10 transition-all"
              >
                Test character →
              </Link>
            </div>

            {/* Basic info */}
            {section("basic", "Basic Information", <>
              {field("Name", draft.name, (v) => update("name", v))}
              {field("Role (displayed to users)", draft.role, (v) => update("role", v), "e.g. English Tutor")}
              {field("Profession (internal detail)", draft.profession, (v) => update("profession", v), "e.g. University Language Instructor")}
              {field("Short description", draft.description, (v) => update("description", v))}
              <div>
                <label className="block text-white/60 text-xs mb-1.5">Personality traits (comma-separated)</label>
                <input
                  value={draft.personality}
                  onChange={(e) => update("personality", e.target.value)}
                  className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400/50"
                />
              </div>
            </>)}

            {/* Conversation style */}
            {section("style", "Conversation Style", <>
              {select("Response length", draft.style.responseLength, RESPONSE_LENGTH_LABELS, (v) => update("style.responseLength", v))}
              {select("Formality level", draft.style.formality, FORMALITY_LABELS, (v) => update("style.formality", v))}
              {select("Grammar correction", draft.style.correctionStyle, CORRECTION_LABELS, (v) => update("style.correctionStyle", v))}
              {draft.style.correctionStyle !== "never" && field(
                "Correction format template",
                draft.style.correctionFormat,
                (v) => update("style.correctionFormat", v),
                "Use {correction} and {explanation} as placeholders"
              )}
              <div className="space-y-4 pt-2">
                {toggle("Corrects mistakes", "Character will point out language errors", draft.style.correctsMistakes, (v) => update("style.correctsMistakes", v))}
                {toggle("Uses slang", "Uses informal expressions and casual language", draft.style.usesSlang, (v) => update("style.usesSlang", v))}
                {toggle("Asks follow-up questions", "Ends responses with a question to continue conversation", draft.style.asksFollowups, (v) => update("style.asksFollowups", v))}
                {toggle("Encourages the user", "Gives positive feedback and motivation", draft.style.encourages, (v) => update("style.encourages", v))}
              </div>
            </>)}

            {/* Voice settings */}
            {section("voice", "Voice & TTS Settings", <>
              {slider("Speech rate", draft.tts.rate, 0.5, 1.5, 0.05, (v) => update("tts.rate", v))}
              {slider("Pitch", draft.tts.pitch, 0.5, 1.5, 0.05, (v) => update("tts.pitch", v))}
              <div className="flex gap-2 mt-2">
                <Link
                  href={`/practice?character=${draft.id}&auto=true`}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  → Test voice in practice session
                </Link>
              </div>
            </>)}

            {/* System prompt */}
            {section("prompt", "AI System Prompt", <>
              <p className="text-white/40 text-xs">This is the exact instruction given to Claude that defines how this character thinks and responds.</p>
              <textarea
                value={draft.systemPrompt}
                onChange={(e) => update("systemPrompt", e.target.value)}
                rows={14}
                className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-3 text-white text-xs font-mono focus:outline-none focus:border-blue-400/50 transition-colors resize-none leading-relaxed"
              />
            </>)}

          </div>
        </div>
      </div>
    </div>
  );
}
