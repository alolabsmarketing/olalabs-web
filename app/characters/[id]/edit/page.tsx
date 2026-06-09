"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function EditCharacterPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [relationshipHint, setRelationshipHint] = useState("");
  const [personalityPrompt, setPersonalityPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/characters/custom")
      .then((r) => r.json())
      .then((chars) => {
        const char = chars.find((c: { id: string }) => c.id === id);
        if (char) {
          setName(char.name);
          setRelationshipHint(char.relationship_hint ?? "");
          setPersonalityPrompt(char.personality_prompt);
        }
        setLoading(false);
      });
  }, [id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/characters/custom/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        relationship_hint: relationshipHint.trim() || null,
        personality_prompt: personalityPrompt.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) { setError("Failed to save. Please try again."); return; }
    router.push("/dashboard");
  }

  async function handleDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/characters/custom/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <p className="text-white/40 text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808]">
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-white/6 bg-[#080808]/90 backdrop-blur-md">
        <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <span className="text-white font-semibold text-sm">Edit Character</span>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-400/60 hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </header>

      <div className="max-w-lg mx-auto px-6 py-10">
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-white/60 text-xs mb-1.5">Relationship <span className="text-white/30">(optional)</span></label>
            <input
              value={relationshipHint}
              onChange={(e) => setRelationshipHint(e.target.value)}
              maxLength={100}
              placeholder="e.g. my professor, a colleague"
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
              className="w-full bg-white/5 border border-white/12 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 transition-colors resize-none leading-relaxed"
            />
          </div>
          {error && <p className="text-red-400/80 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-white text-[#080808] font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
