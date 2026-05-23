"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CHARACTERS } from "@/lib/characters";
import { cn } from "@/lib/utils";
import { ArrowRight, Users, BookOpen, MessageCircle, PenLine, AudioLines } from "lucide-react";

const SCENARIOS = [
  { title: "Visa Interview", icon: "🛂", desc: "Practice for US, UK or Schengen visa appointments" },
  { title: "Job Interview", icon: "💼", desc: "Ace your next career opportunity with confidence" },
  { title: "Restaurant", icon: "🍽️", desc: "Order food, make reservations, handle complaints" },
  { title: "Doctor Visit", icon: "🏥", desc: "Explain symptoms, understand medical advice" },
  { title: "Hotel Check-in", icon: "🏨", desc: "Navigate travel accommodation with ease" },
  { title: "University Admission", icon: "🎓", desc: "Prepare for academic interviews and discussions" },
];

const NAV_TABS = [
  { id: "creative", label: "OLA Creative" },
  { id: "characters", label: "OLA Characters" },
  { id: "api", label: "OLA API" },
];

const BOTTOM_NAV = [
  { label: "AI Characters", icon: Users, tabId: "creative" },
  { label: "English Learning", icon: BookOpen, tabId: "characters" },
  { label: "Conversation", icon: MessageCircle, tabId: "characters" },
  { label: "Storytelling", icon: PenLine, tabId: "creative" },
  { label: "Voice Tools", icon: AudioLines, tabId: "api" },
];

const TAB_HEADINGS: Record<string, { title: string; subtitle: string }> = {
  creative: {
    title: "AI Character Studio",
    subtitle: "Build a cast of intelligent voice characters\nfor learning, storytelling, and conversation.",
  },
  characters: {
    title: "Real-Life Scenarios",
    subtitle: "Practice in situations that matter most.\nPick a scenario and start in seconds.",
  },
  api: {
    title: "Build with OLA",
    subtitle: "Bring AI voice characters into your own\nproduct with our developer API.",
  },
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("creative");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsLoggedIn(d.loggedIn))
      .catch(() => {});
  }, []);

  // Show 3 featured characters on landing
  const showcaseChars = CHARACTERS.slice(0, 3);
  const defaultChar = CHARACTERS[0];

  const heading = TAB_HEADINGS[activeTab];

  return (
    <div className="ola-page-blue min-h-screen flex flex-col overflow-hidden">
      <div className="ola-wave-bg-1 pointer-events-none" />
      <div className="ola-wave-bg-2 pointer-events-none" />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-start justify-between px-10 pt-8">
        {/* Left: Logo + Nav */}
        <div className="flex flex-col gap-5">
          <span className="text-white font-bold text-2xl tracking-tight">OLA</span>
          <nav className="ola-nav-pill">
            {NAV_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn("ola-nav-btn", activeTab === tab.id && "ola-nav-btn-active")}
              >
                {activeTab === tab.id && <span className="ola-nav-dot" />}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right: Auth + Title */}
        <div className="flex flex-col items-end gap-4">
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="ola-btn-white text-sm">
                Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-1.5 rounded-full border border-white/30 text-white/80 hover:text-white hover:border-white/60 text-sm font-medium transition-all">
                  Sign in
                </Link>
                <Link href="/register" className="ola-btn-white text-sm">
                  Get started <ArrowRight size={13} />
                </Link>
              </>
            )}
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold text-white leading-tight tracking-tight">
              {heading.title}
            </h1>
            <p className="text-white/55 text-sm mt-2 leading-relaxed whitespace-pre-line">
              {heading.subtitle}
            </p>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 pb-8">

        {/* OLA Creative: character photo cards */}
        {activeTab === "creative" && (
          <div className="flex items-end justify-center gap-6 mt-6">
            {showcaseChars.map((char, i) => {
              const isCenter = i === 1;
              return (
                <Link
                  key={char.id}
                  href={`/practice?character=${char.id}&auto=true`}
                  className={cn(
                    "ola-char-link group relative overflow-hidden rounded-2xl bg-black/40 border border-white/10 transition-all",
                    isCenter ? "w-44 shadow-2xl" : "w-36 opacity-85 hover:opacity-100"
                  )}
                  style={{ height: isCenter ? "280px" : "230px" }}
                >
                  {char.photo ? (
                    <Image
                      src={char.photo}
                      alt={char.name}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      sizes="200px"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{ background: `radial-gradient(circle at 38% 35%, ${char.color}60, ${char.color}15)` }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-white font-semibold text-sm">{char.name}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-white/50 text-xs">{char.role}</p>
                  </div>
                  {isCenter && (
                    <div className="absolute top-3 left-3">
                      <span className="text-xs bg-white/90 text-[#07112b] font-bold px-2 py-0.5 rounded-full">★ FREE</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* OLA Characters: scenario cards */}
        {activeTab === "characters" && (
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-3 gap-4">
              {SCENARIOS.map((s) => (
                <Link
                  key={s.title}
                  href={`/practice?character=${defaultChar.id}&scenario=${encodeURIComponent(s.title)}&auto=true`}
                  className="ola-scenario-card p-6 flex flex-col items-start gap-3"
                >
                  <span className="text-3xl">{s.icon}</span>
                  <p className="font-semibold text-base text-white">{s.title}</p>
                  <p className="text-sm text-white/50 leading-relaxed">{s.desc}</p>
                  <div className="mt-auto flex items-center gap-1 text-sm text-blue-300 font-medium">
                    Start <ArrowRight size={12} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* OLA API */}
        {activeTab === "api" && (
          <div className="w-full max-w-2xl text-center">
            <div className="ola-code-block p-6 mb-8 text-left">
              <p className="text-xs font-mono uppercase tracking-widest text-white/35 mb-3">Quick example</p>
              <pre className="text-sm font-mono text-green-300 leading-relaxed">{`POST /api/chat\n{ "characterId": "ethan", "messages": [...] }`}</pre>
            </div>
            <Link href="/register" className="ola-btn-white">
              Request API access <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </main>

      {/* ── BOTTOM NAV ── */}
      <div className="relative z-10 ola-bottom-bar">
        <div className="flex items-center justify-between px-10 py-4">
          <div className="flex items-center gap-8">
            {BOTTOM_NAV.map(({ label, icon: Icon, tabId }) => (
              <button
                key={label}
                onClick={() => setActiveTab(tabId)}
                className={cn(
                  "flex items-center gap-2 text-sm transition-colors",
                  activeTab === tabId && label === "AI Characters"
                    ? "text-white font-semibold"
                    : "text-white/40 hover:text-white/70"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
