"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Lock, MessageCircle, Phone, AudioLines } from "lucide-react";
import UpgradeModal from "@/components/UpgradeModal";
import type { Character } from "@/lib/characters";

interface Props {
  character: Character;
  locked: boolean;
  label: string;
}

export default function CharacterCard({ character, locked, label }: Props) {
  const [showUpgrade, setShowUpgrade] = useState(false);

  const card = (
    <div className="ola-char-card group relative overflow-hidden rounded-2xl bg-[#0f0f0f] border border-white/8 transition-all duration-300 hover:border-white/15 hover:-translate-y-1">
      {/* Photo */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        {character.photo ? (
          <Image
            src={character.photo}
            alt={character.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `radial-gradient(circle at 38% 35%, ${character.color}60, ${character.color}20)` }}
          >
            <span className="text-4xl font-bold" style={{ color: character.color }}>
              {character.avatarInitials}
            </span>
          </div>
        )}
        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/30 to-transparent" />

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Lock size={16} className="text-white/60" />
            </div>
            <span className="text-white/50 text-xs font-medium">Pro</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 -mt-2 relative z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-semibold text-base leading-tight">{character.name}</span>
          {!locked && <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />}
        </div>
        <p className="text-white/50 text-xs mb-3">{character.role}</p>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-3">
          {[
            { icon: Phone, title: "Call" },
            { icon: MessageCircle, title: "Chat" },
            { icon: AudioLines, title: "Voice" },
          ].map(({ icon: Icon, title }) => (
            <div
              key={title}
              title={title}
              className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center"
            >
              <Icon size={13} className="text-white/60" />
            </div>
          ))}
        </div>

        <p className="text-white/40 text-xs leading-relaxed line-clamp-2">{character.description}</p>
      </div>
    </div>
  );

  return (
    <>
      {showUpgrade && <UpgradeModal reason="locked_character" onClose={() => setShowUpgrade(false)} />}
      {locked ? (
        <button onClick={() => setShowUpgrade(true)} className="w-full text-left">
          {card}
        </button>
      ) : (
        <Link href={`/practice?character=${character.id}&auto=true`} title={label}>
          {card}
        </Link>
      )}
    </>
  );
}
