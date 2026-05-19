"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";
import type { Character } from "@/lib/characters";

interface Props {
  character: Character;
  locked: boolean;
  label: string;
}

export default function CharacterCard({ character, locked, label }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const avatarDiv = (
    <div
      className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border border-white/20"
      style={{ background: `radial-gradient(circle, ${character.color}30, transparent)` }}
    >
      <span className="text-sm font-bold" style={{ color: character.color }}>
        {character.avatarInitials}
      </span>
    </div>
  );

  const content = (
    <>
      {avatarDiv}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{character.name}</p>
        <p className="text-white/50 text-xs truncate">{character.role}</p>
      </div>
      {locked
        ? <Lock size={14} className="text-white/30 flex-shrink-0" />
        : <ArrowRight size={14} className="text-white/30 flex-shrink-0" />
      }
    </>
  );

  return (
    <>
      {showUpgrade && <UpgradeModal reason="locked_character" onClose={() => setShowUpgrade(false)} />}
      {locked ? (
        <button
          onClick={() => setShowUpgrade(true)}
          className="glass-card p-5 flex items-center gap-4 opacity-60 hover:opacity-80 transition-all w-full text-left"
        >
          {content}
        </button>
      ) : (
        <Link
          href={`/practice?character=${character.id}`}
          className="glass-card p-5 flex items-center gap-4 hover:bg-white/10 transition-all"
        >
          {content}
        </Link>
      )}
    </>
  );
}
