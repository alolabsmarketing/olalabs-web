"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

  const emma = CHARACTERS.find((c) => c.id === "emma")!;
  const noah = CHARACTERS.find((c) => c.id === "noah")!;
  const sophie = CHARACTERS.find((c) => c.id === "sophie")!;

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
            <Link href="/pricing" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
              Fiyatlar
            </Link>
            {isLoggedIn ? (
              <Link href="/dashboard" className="ola-btn-white text-sm">
                Dashboard <ArrowRight size={13} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-white/60 hover:text-white text-sm font-medium transition-colors">
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

        {/* OLA Creative: character showcase */}
        {activeTab === "creative" && (
          <div className="flex items-end justify-center gap-16">
            {/* Noah — smaller, left */}
            <div className="flex flex-col items-center gap-5">
              <Link href={`/practice?character=${noah.id}&auto=true`} className="ola-char-link">
                <div className="ola-circle-noah" />
              </Link>
              <div className="text-center">
                <p className="text-blue-300 font-bold text-xl">{noah.name}</p>
                <p className="text-white/50 text-sm mt-0.5">{noah.role}</p>
              </div>
            </div>

            {/* Emma — featured, center, larger */}
            <div className="flex flex-col items-center gap-5">
              <Link href={`/practice?character=${emma.id}&auto=true`} className="ola-char-link relative block">
                <div className="ola-circle-emma" />
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                  <span className="ola-featured-badge">★ FEATURED</span>
                </div>
              </Link>
              <div className="text-center">
                <p className="text-white font-bold text-2xl">{emma.name}</p>
                <p className="text-blue-300 text-sm mt-0.5">{emma.role}</p>
              </div>
            </div>

            {/* Sophie — smaller, right */}
            <div className="flex flex-col items-center gap-5">
              <Link href={`/practice?character=${sophie.id}&auto=true`} className="ola-char-link">
                <div className="ola-circle-sophie" />
              </Link>
              <div className="text-center">
                <p className="text-emerald-300 font-bold text-xl">{sophie.name}</p>
                <p className="text-white/50 text-sm mt-0.5">{sophie.role}</p>
              </div>
            </div>
          </div>
        )}

        {/* OLA Characters: scenario cards */}
        {activeTab === "characters" && (
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-3 gap-4">
              {SCENARIOS.map((s) => (
                <Link
                  key={s.title}
                  href={`/practice?character=emma&scenario=${encodeURIComponent(s.title)}&auto=true`}
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
              <pre className="text-sm font-mono text-green-300 leading-relaxed">{`POST /api/chat\n{ "characterId": "emma", "messages": [...] }`}</pre>
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
          <Link href="/register" className="ola-btn-try-ola">
            Try OLA <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
