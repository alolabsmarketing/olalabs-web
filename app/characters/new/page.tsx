"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewCharacterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [relationshipHint, setRelationshipHint] = useState("");
  const [personalityPrompt, setPersonalityPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || personalityPrompt.trim().length < 10) {
      setError("Name and personality description (min 10 chars) are required.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch("/api/characters/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        relationship_hint: relationshipHint.trim() || null,
        personality_prompt: personalityPrompt.trim(),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      if (data.error === "LIMIT_REACHED") {
        setError("You've reached your custom character limit. Upgrade to add more.");
      } else {
        setError("Something went wrong. Please try again.");
      }
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-white font-semibold text-sm">New Character</span>
        <div className="w-6" />
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-white text-2xl font-bold mb-2">Create your character</h1>
        <p className="text-white/40 text-sm mb-8">
          This character will remember your conversations and adapt to you over time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              placeholder="e.g. Sarah"
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-white/60 text-xs mb-1.5">
              Relationship <span className="text-white/30">(optional)</span>
            </label>
            <input
              value={relationshipHint}
              onChange={(e) => setRelationshipHint(e.target.value)}
              maxLength={100}
              placeholder="e.g. my professor, a colleague, my manager"
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-white/60 text-xs">Personality & style</label>
              <span className="text-white/30 text-xs">{personalityPrompt.length}/300</span>
            </div>
            <textarea
              value={personalityPrompt}
              onChange={(e) => setPersonalityPrompt(e.target.value.slice(0, 300))}
              rows={5}
              placeholder="Describe how this person speaks and behaves. e.g. Strict but fair. Expects preparation. Gets straight to the point. Doesn't sugar-coat feedback."
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
            />
            <p className="text-white/25 text-xs mt-1.5">
              Min 10 characters. Be specific — the more detail, the more realistic.
            </p>
          </div>

          {error && (
            <p className="text-red-400/80 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-white text-[#080808] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create character"}
          </button>
        </form>
      </div>
    </div>
  );
}
