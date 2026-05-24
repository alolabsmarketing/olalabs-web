"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CHARACTERS } from "@/lib/characters";
import { ArrowRight, Phone, MessageCircle, AudioLines } from "lucide-react";

const SCENARIOS = [
  { title: "Visa Interview", icon: "🛂", desc: "US, UK or Schengen visa appointments" },
  { title: "Job Interview", icon: "💼", desc: "Ace your next career opportunity" },
  { title: "Restaurant", icon: "🍽️", desc: "Order food, make reservations" },
  { title: "Doctor Visit", icon: "🏥", desc: "Explain symptoms, understand advice" },
  { title: "Hotel Check-in", icon: "🏨", desc: "Navigate travel accommodation" },
  { title: "University Admission", icon: "🎓", desc: "Academic interviews and discussions" },
];

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsLoggedIn(d.loggedIn))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* ── HEADER ── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 md:px-8 h-14 border-b border-white/6 bg-[#080808]/95 backdrop-blur-md">
        <span className="text-white font-bold text-xl tracking-tight">olalabs</span>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <a href="#characters" className="text-white/45 hover:text-white transition-colors">Characters</a>
          <a href="#scenarios" className="text-white/45 hover:text-white transition-colors">Scenarios</a>
          <Link href="/pricing" className="text-white/45 hover:text-white transition-colors">Pricing</Link>
        </nav>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all"
            >
              Dashboard <ArrowRight size={13} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-white/50 hover:text-white text-sm transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all"
              >
                Get started <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="pt-28 md:pt-36 pb-16 md:pb-20 px-5 md:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/6 border border-white/10 text-white/50 text-xs mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          6 AI characters available
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
          Practice English<br />
          <span className="text-white/40">with AI characters</span>
        </h1>
        <p className="text-white/40 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
          Real conversations. Real scenarios. Six unique characters ready to help you speak with confidence.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 min-h-[48px]">
          {isLoggedIn === null ? null : isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all text-sm"
            >
              Go to Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all text-sm"
              >
                Start for free <ArrowRight size={14} />
              </Link>
              <Link
                href="/pricing"
                className="px-6 py-3 border border-white/12 text-white/55 hover:text-white hover:border-white/25 rounded-full text-sm font-medium transition-all"
              >
                See plans
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── CHARACTERS ── */}
      <section id="characters" className="px-5 md:px-8 pb-24 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white/35 text-xs font-semibold uppercase tracking-widest">Characters</h2>
          <span className="text-white/20 text-xs">Free: Ethan & Noah</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHARACTERS.map((char) => (
            <Link
              key={char.id}
              href={`/practice?character=${char.id}&auto=true`}
              className="group relative overflow-hidden rounded-2xl bg-[#111111] border border-white/6 hover:border-white/14 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            >
              {/* Photo */}
              <div className="relative w-full overflow-hidden" style={{ aspectRatio: "3/4" }}>
                {char.photo ? (
                  <Image
                    src={char.photo}
                    alt={char.name}
                    fill
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ background: `radial-gradient(circle at 38% 35%, ${char.color}50, ${char.color}10)` }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#111111] via-[#111111]/15 to-transparent" />
              </div>

              {/* Info */}
              <div className="p-4 -mt-1 relative z-10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-semibold text-[15px]">{char.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                </div>
                <p className="text-white/40 text-xs mb-3">{char.role}</p>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mb-3">
                  {[Phone, MessageCircle, AudioLines].map((Icon, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-white/6 border border-white/8 flex items-center justify-center"
                    >
                      <Icon size={12} className="text-white/45" />
                    </div>
                  ))}
                </div>

                <p className="text-white/35 text-xs leading-relaxed line-clamp-2">{char.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SCENARIOS ── */}
      <section id="scenarios" className="px-5 md:px-8 pb-24 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white/35 text-xs font-semibold uppercase tracking-widest">Real-life scenarios</h2>
          <span className="text-white/20 text-xs">20+ available</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIOS.map((s) => (
            <Link
              key={s.title}
              href={`/practice?character=ethan&scenario=${encodeURIComponent(s.title)}&auto=true`}
              className="group flex items-center gap-4 p-4 rounded-xl bg-white/3 border border-white/6 hover:bg-white/5 hover:border-white/12 transition-all"
            >
              <span className="text-2xl flex-shrink-0">{s.icon}</span>
              <div className="min-w-0">
                <p className="text-white text-sm font-medium">{s.title}</p>
                <p className="text-white/35 text-xs mt-0.5 truncate">{s.desc}</p>
              </div>
              <ArrowRight size={13} className="text-white/20 flex-shrink-0 ml-auto transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA STRIP ── */}
      <section className="px-5 md:px-8 pb-24 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-white/4 border border-white/8 p-10 text-center">
          {isLoggedIn === true ? (
            <>
              <h3 className="text-white text-2xl font-bold mb-2">Continue your journey</h3>
              <p className="text-white/40 text-sm mb-6">Pick up where you left off.</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all text-sm"
              >
                Go to Dashboard <ArrowRight size={14} />
              </Link>
            </>
          ) : isLoggedIn === false ? (
            <>
              <h3 className="text-white text-2xl font-bold mb-2">Ready to start speaking?</h3>
              <p className="text-white/40 text-sm mb-6">Free plan includes Ethan & Noah — no credit card required.</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-full hover:bg-white/90 transition-all text-sm"
              >
                Create free account <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <div className="h-[120px]" />
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/6 px-5 md:px-8 py-5 flex items-center justify-between">
        <span className="text-white/25 text-xs font-bold">olalabs</span>
        <div className="flex items-center gap-6 text-white/25 text-xs">
          <Link href="/pricing" className="hover:text-white/50 transition-colors">Pricing</Link>
          {isLoggedIn === true ? (
            <Link href="/dashboard" className="hover:text-white/50 transition-colors">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-white/50 transition-colors">Sign in</Link>
              <Link href="/register" className="hover:text-white/50 transition-colors">Register</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
