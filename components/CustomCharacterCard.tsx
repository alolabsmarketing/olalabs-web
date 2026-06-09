"use client";
import Link from "next/link";
import Image from "next/image";
import type { DbCustomCharacter } from "@/lib/db-types";

interface Props {
  character: DbCustomCharacter;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CustomCharacterCard({ character }: Props) {
  const initials = character.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group relative bg-[#0f0f0f] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/18 hover:-translate-y-1">
      {/* Personal badge */}
      <div className="absolute top-2.5 right-2.5 z-10 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#a78bfa]/15 text-[#a78bfa] border border-[#a78bfa]/25 backdrop-blur-sm">
        Personal
      </div>

      {/* Avatar */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        {character.avatar_url ? (
          <Image
            src={character.avatar_url}
            alt={character.name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#a78bfa]/20 to-[#a78bfa]/5">
            <span className="text-4xl font-bold text-[#a78bfa]">{initials}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-[#0f0f0f]/30 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4 -mt-2 relative z-10">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-white font-semibold text-base leading-tight">{character.name}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
        </div>
        {character.relationship_hint && (
          <p className="text-white/40 text-xs mb-1 capitalize">{character.relationship_hint}</p>
        )}
        <p className="text-white/25 text-[11px] mb-3">
          Last chat: {timeAgo(character.memory_updated_at ?? character.created_at)}
        </p>
        <div className="flex gap-2">
          <Link
            href={`/practice?customCharacter=${character.id}&auto=true`}
            className="flex-1 text-center py-1.5 rounded-xl bg-white/7 border border-white/10 text-white/70 text-xs font-medium hover:bg-white/12 transition-all"
          >
            Continue →
          </Link>
          <Link
            href={`/characters/${character.id}/edit`}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-white/40 text-xs hover:text-white/70 transition-all"
          >
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
