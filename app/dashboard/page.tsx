"use client";

import Link from "next/link";
import { CHARACTERS } from "@/lib/characters";
import { ArrowRight, MessageCircle, Clock, Star, Settings2 } from "lucide-react";

export default function DashboardPage() {
  const featured = CHARACTERS.find((c) => c.featured)!;
  const others = CHARACTERS.filter((c) => !c.featured);

  return (
    <div className="ola-gradient-bg relative min-h-screen">
      <div className="ola-wave" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <Link href="/" className="text-white font-bold text-2xl tracking-tight">OLA</Link>
          <nav className="flex items-center gap-4 text-white/60 text-sm">
            <Link href="/dashboard" className="text-white font-medium">Home</Link>
            <Link href="/characters/editor" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Settings2 size={14} /> Characters
            </Link>
            <Link href="/practice" className="hover:text-white transition-colors">Practice</Link>
            <Link href="/profile" className="hover:text-white transition-colors">Profile</Link>
          </nav>
        </header>

        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-white text-2xl font-bold">Good to see you.</h2>
          <p className="text-white/50 text-sm mt-1">Choose a character and start practicing.</p>
        </div>

        {/* Featured character */}
        <div className="glass-card p-6 mb-6 flex items-center gap-6">
          <div
            className="w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-white/30"
            style={{ background: `radial-gradient(circle, ${featured.color}30, transparent)` }}
          >
            <span className="text-2xl font-bold" style={{ color: featured.color }}>
              {featured.avatarInitials}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-yellow-400 text-xs font-semibold">★ FEATURED</span>
            </div>
            <h3 className="text-white text-lg font-bold">{featured.name}</h3>
            <p className="text-blue-300 text-sm">{featured.role}</p>
            <p className="text-white/50 text-sm mt-1">{featured.description}</p>
          </div>
          <Link
            href={`/practice?character=${featured.id}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#07112b] font-semibold text-sm hover:bg-white/90 transition-all flex-shrink-0"
          >
            Start <ArrowRight size={14} />
          </Link>
        </div>

        {/* Other characters */}
        <h3 className="text-white/70 text-sm font-medium mb-4">All Characters</h3>
        <div className="grid grid-cols-2 gap-4 mb-10">
          {others.map((char) => (
            <Link
              key={char.id}
              href={`/practice?character=${char.id}`}
              className="glass-card p-5 flex items-center gap-4 hover:bg-white/10 transition-all"
            >
              <div
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center border border-white/20"
                style={{ background: `radial-gradient(circle, ${char.color}30, transparent)` }}
              >
                <span className="text-sm font-bold" style={{ color: char.color }}>
                  {char.avatarInitials}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{char.name}</p>
                <p className="text-white/50 text-xs truncate">{char.role}</p>
              </div>
              <ArrowRight size={14} className="text-white/30 flex-shrink-0" />
            </Link>
          ))}
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: MessageCircle, label: "Sessions", value: "0" },
            { icon: Clock, label: "Hours practiced", value: "0h" },
            { icon: Star, label: "Avg. score", value: "—" },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass-card p-4 text-center">
              <Icon size={20} className="text-white/40 mx-auto mb-2" />
              <p className="text-white font-bold text-xl">{value}</p>
              <p className="text-white/50 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
