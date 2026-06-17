"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { CHARACTERS } from "@/lib/characters";
import { translations } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import LandingScenarioForm from "@/components/LandingScenarioForm";
import {
  ArrowRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Captions,
  MessageCircle,
  Headphones,
  BookOpen,
  Users,
  X,
  Menu,
} from "lucide-react";

// ── Promo countdown — resets daily at midnight ───────────────────────────────
function getDailyEnd(): number {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

function useCountdown() {
  const [diff, setDiff] = useState<number | null>(null); // null = not yet mounted (avoids SSR/CSR mismatch)
  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, getDailyEnd() - Date.now());
      setDiff(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (diff === null) return { h: 0, m: 0, s: 0, mounted: false };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, mounted: true };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[40px]">
      <span className="text-[#080808] font-bold text-lg leading-none tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[#080808]/60 text-[9px] uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
}

// ── Wave animation (voice indicator) ────────────────────────────────────────
function VoiceWave() {
  return (
    <div className="flex items-end gap-[3px] h-5">
      {[4, 8, 12, 8, 14, 6, 10, 14, 8, 6].map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[#f5c518]"
          style={{
            height: `${h}px`,
            animation: `wave ${0.6 + i * 0.08}s ease-in-out infinite alternate`,
            animationDelay: `${i * 60}ms`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
}

// ── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2 rounded-full bg-white/10 w-fit">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/50"
          style={{ animation: `dot-pulse 1.2s ease-in-out infinite`, animationDelay: `${i * 0.2}s` }}
        />
      ))}
      <style>{`
        @keyframes dot-pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [showPromo, setShowPromo] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [landingScenarioText, setLandingScenarioText] = useState("");
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoTime, setVideoTime] = useState({ current: 0, total: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const countdown = useCountdown();
  const { lang } = useLocale();
  const T = translations[lang].landing;

  function toggleHeroVideo() {
    const video = heroVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsVideoPaused(false);
    } else {
      video.pause();
      setIsVideoPaused(true);
    }
  }

  function toggleMute() {
    const v = heroVideoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  }

  function toggleFullscreen() {
    const v = heroVideoRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      v.requestFullscreen();
    }
  }

  function handleTimeUpdate() {
    const v = heroVideoRef.current;
    if (!v || !v.duration) return;
    setVideoProgress((v.currentTime / v.duration) * 100);
    setVideoTime({ current: v.currentTime, total: v.duration });
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    const v = heroVideoRef.current;
    if (!v) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * v.duration;
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  useEffect(() => {
    const dismissed = localStorage.getItem("ola_promo_dismissed");
    if (dismissed) setShowPromo(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsLoggedIn(!!d.loggedIn))
      .catch(() => setIsLoggedIn(false));
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function dismissPromo() {
    localStorage.setItem("ola_promo_dismissed", "1");
    setShowPromo(false);
  }

  const avatarChars = CHARACTERS.slice(0, 4);
  const heroChar = CHARACTERS.find((c) => c.id === "nadia");

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">

      {/* ── PROMO BANNER ──────────────────────────────────────────────────── */}
      {showPromo && countdown.mounted && (
        <div className="relative bg-[#f5c518] text-[#080808] py-2.5 px-4">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{T.promo.limitedTime}</span>
            <p className="font-bold text-sm sm:text-base">
              {T.promo.getOff("50%")}
            </p>
            <div className="flex items-center gap-3">
              <TimeUnit value={countdown.h} label="hrs" />
              <span className="text-[#080808]/40 font-bold text-lg -mt-2">:</span>
              <TimeUnit value={countdown.m} label="min" />
              <span className="text-[#080808]/40 font-bold text-lg -mt-2">:</span>
              <TimeUnit value={countdown.s} label="sec" />
            </div>
            <Link
              href="/pricing"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#080808] text-[#f5c518] text-sm font-bold rounded-full hover:bg-[#080808]/80 transition-all"
            >
              {T.promo.claimNow} <ArrowRight size={12} />
            </Link>
          </div>
          <button
            onClick={dismissPromo}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#080808]/50 hover:text-[#080808] transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-5 md:px-8 h-14 border-b border-white/6 bg-[#080808]/95 backdrop-blur-md">
        <Link href="/" className="text-white font-bold text-xl tracking-tight select-none">
          olalabs
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <button
            onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
            className="text-white/45 hover:text-white transition-colors"
          >
            {T.nav.howItWorks}
          </button>
          <button
            onClick={() => document.getElementById("characters")?.scrollIntoView({ behavior: "smooth" })}
            className="text-white/45 hover:text-white transition-colors"
          >
            {T.nav.characters}
          </button>
          <Link href="/pricing" className="text-white/45 hover:text-white transition-colors">{T.nav.pricing}</Link>
        </nav>

        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <LanguageSwitcher compact className="hidden sm:flex" />

          {isLoggedIn === null ? (
            <div className="w-24 h-8 rounded-full bg-white/6 animate-pulse" />
          ) : isLoggedIn ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5c518] text-[#080808] text-sm font-bold rounded-full hover:bg-[#f5c518]/90 transition-all"
            >
              {T.nav.dashboard} <ArrowRight size={12} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block text-white/50 hover:text-white text-sm transition-colors">
                {T.nav.signIn}
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#f5c518] text-[#080808] text-sm font-bold rounded-full hover:bg-[#f5c518]/90 transition-all"
              >
                {T.nav.getStarted} <ArrowRight size={12} />
              </Link>
            </>
          )}

          {/* Mobile hamburger */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 text-white/50 hover:text-white transition-colors"
            >
              <Menu size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-44 rounded-xl bg-[#111] border border-white/10 py-1 shadow-xl">
                {[
                  { label: T.nav.howItWorks, href: "#how-it-works" },
                  { label: T.nav.characters, href: "#characters" },
                  { label: T.nav.pricing, href: "/pricing" },
                  { label: isLoggedIn ? T.nav.dashboard : T.nav.signIn, href: isLoggedIn ? "/dashboard" : "/login" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO — VIDEO PLAYER SECTION ───────────────────────────────────── */}
      <section id="how-it-works" className="px-4 md:px-8 pt-10 pb-6 max-w-5xl mx-auto">
        <div className="relative rounded-2xl overflow-hidden bg-[#0d0d0d] border border-white/8" style={{ aspectRatio: "16/9" }}>
          {/* Hero demo video */}
          <video
            ref={heroVideoRef}
            autoPlay
            loop
            muted
            playsInline
            onTimeUpdate={handleTimeUpdate}
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src="/hero-demo.mp4" type="video/mp4" />
          </video>

          {/* Dark cinematic overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080808]/50 via-transparent to-[#080808]/20" />

          {/* Top-left label */}
          <div className="absolute top-5 left-5 flex items-center gap-2">
            <span className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">01</span>
            <div className="w-px h-3 bg-white/20" />
            <span className="text-white/40 text-[11px] font-semibold uppercase tracking-widest">Conversations</span>
          </div>

          {/* Center play/pause button */}
          <div
            className="absolute inset-0 flex items-center justify-center group"
            onClick={toggleHeroVideo}
          >
            <div className={`w-16 h-16 rounded-full backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all cursor-pointer ${isVideoPaused ? "bg-white/25 opacity-100" : "bg-white/10 opacity-0 group-hover:opacity-100"}`}>
              {isVideoPaused ? (
                <Play size={22} className="text-white ml-1" fill="white" />
              ) : (
                <Pause size={22} className="text-white" fill="white" />
              )}
            </div>
          </div>

          {/* Bottom text */}
          <div className="absolute bottom-16 left-5 md:left-8 max-w-xs">
            <h1 className="text-white font-bold text-3xl md:text-4xl leading-[1.1] mb-2">
              {T.hero.headline1} <span className="text-[#f5c518]">{T.hero.headline2}</span>
              <br />{T.hero.headline3}
            </h1>
            <p className="text-white/50 text-sm leading-relaxed">
              {T.hero.tagline}
            </p>
          </div>

          {/* Video progress bar + controls */}
          <div className="absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-[#080808] to-transparent">
            {/* Progress bar */}
            <div
              className="w-full h-[3px] bg-white/15 rounded-full mb-3 cursor-pointer"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-[#f5c518] rounded-full transition-all duration-100"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
            {/* Controls row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isVideoPaused ? (
                  <Play size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" onClick={toggleHeroVideo} />
                ) : (
                  <Pause size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" onClick={toggleHeroVideo} />
                )}
                {isMuted ? (
                  <VolumeX size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" onClick={toggleMute} />
                ) : (
                  <Volume2 size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" onClick={toggleMute} />
                )}
                <span className="text-white/35 text-[11px] tabular-nums">
                  {formatTime(videoTime.current)} / {formatTime(videoTime.total)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Captions size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" />
                <Maximize2 size={14} className="text-white/60 cursor-pointer hover:text-white transition-colors" onClick={toggleFullscreen} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRY IT NOW — CHAT DEMO ────────────────────────────────────────── */}
      <section className="px-4 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-[#111] border border-white/8 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Left: copy + CTA */}
            <div className="p-8 md:p-10 flex flex-col justify-between">
              <div>
                <span className="text-[#f5c518] text-[10px] font-bold uppercase tracking-widest mb-4 block">{T.tryItNow.badge}</span>
                <h2 className="text-white font-bold text-3xl md:text-4xl leading-[1.1] mb-4">
                  {T.tryItNow.heading1}<br />
                  <span className="text-[#f5c518]">{T.tryItNow.heading2}</span>
                </h2>
                <p className="text-white/45 text-sm leading-relaxed mb-8">
                  {T.tryItNow.subtext}
                </p>
              </div>

              {/* Avatar row + wave */}
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex -space-x-2">
                    {avatarChars.map((c) => (
                      <div
                        key={c.id}
                        className="w-8 h-8 rounded-full border-2 border-[#111] overflow-hidden flex-shrink-0"
                      >
                        {c.photo ? (
                          <Image
                            src={c.photo}
                            alt={c.name}
                            width={32}
                            height={32}
                            className="object-cover object-top w-full h-full"
                          />
                        ) : (
                          <div className="w-full h-full" style={{ background: `radial-gradient(circle, ${c.color}60, ${c.color}20)` }} />
                        )}
                      </div>
                    ))}
                  </div>
                  <VoiceWave />
                </div>

                <Link
                  href={isLoggedIn ? "/dashboard" : "/register"}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-[#f5c518] text-[#080808] font-bold text-sm rounded-full hover:bg-[#f5c518]/90 transition-all"
                >
                  {T.tryItNow.cta} <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Right: chat preview */}
            <div className="border-t md:border-t-0 md:border-l border-white/6 p-8 md:p-10 flex flex-col justify-center gap-3 bg-[#0d0d0d]">
              {/* Typing indicator */}
              <div className="flex justify-end mb-1">
                <TypingDots />
              </div>

              {/* Character message */}
              <div className="flex flex-col gap-0.5 max-w-[85%]">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/8 border border-white/6">
                  <p className="text-white text-sm font-medium">How was your day?</p>
                  <p className="text-white/35 text-xs mt-0.5">Nasıl geçti günün?</p>
                </div>
                <div className="flex items-center gap-1.5 pl-1 mt-0.5">
                  <Volume2 size={10} className="text-white/20" />
                </div>
              </div>

              {/* User reply */}
              <div className="flex flex-col gap-0.5 items-end">
                <div className="px-4 py-3 rounded-2xl rounded-tr-sm bg-[#f5c518] max-w-[85%]">
                  <p className="text-[#080808] text-sm font-semibold">It was great!</p>
                  <p className="text-[#080808]/50 text-xs mt-0.5">Harikaydı!</p>
                </div>
              </div>

              {/* Character follow-up */}
              <div className="flex flex-col gap-0.5 max-w-[85%]">
                <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/8 border border-white/6">
                  <p className="text-white text-sm font-medium">What did you do?</p>
                  <p className="text-white/35 text-xs mt-0.5">Ne yaptın?</p>
                </div>
                <div className="flex items-center gap-1.5 pl-1 mt-0.5">
                  <Volume2 size={10} className="text-white/20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── BUILD REAL SKILLS — CHARACTER CARDS ──────────────────────────── */}
      <section id="characters" className="px-4 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-[#f5c518] text-[10px] font-bold uppercase tracking-widest mb-2 block">{T.buildSkills.badge}</span>
            <h2 className="text-white font-bold text-3xl md:text-4xl">{T.buildSkills.heading}</h2>
          </div>
          <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 text-white/40 hover:text-white text-sm transition-colors">
            {T.buildSkills.seeAll} <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { char: CHARACTERS.find((c) => c.id === "ethan")!, icon: MessageCircle, label: T.buildSkills.cards.englishTutor.label, desc: T.buildSkills.cards.englishTutor.desc },
            { char: CHARACTERS.find((c) => c.id === "nadia")!, icon: Users, label: T.buildSkills.cards.jobInterviews.label, desc: T.buildSkills.cards.jobInterviews.desc },
            { char: CHARACTERS.find((c) => c.id === "dr-chen")!, icon: BookOpen, label: T.buildSkills.cards.medicalTalks.label, desc: T.buildSkills.cards.medicalTalks.desc },
            { char: CHARACTERS.find((c) => c.id === "morgan")!, icon: Headphones, label: T.buildSkills.cards.visaInterview.label, desc: T.buildSkills.cards.visaInterview.desc },
          ].map(({ char, icon: Icon, label, desc }) => (
            <Link
              key={label}
              href={`/practice?character=${char?.id ?? "ethan"}&auto=true`}
              className="group relative rounded-2xl overflow-hidden bg-[#111] border border-white/6 hover:border-white/14 transition-all duration-300 hover:-translate-y-0.5"
              style={{ aspectRatio: "3/4" }}
            >
              {/* Character photo background */}
              {char?.photo && (
                <Image
                  src={char.photo}
                  alt={char.name}
                  fill
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-[#080808]/30 to-transparent" />

              {/* Icon badge */}
              <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[#f5c518]/15 border border-[#f5c518]/30 flex items-center justify-center">
                <Icon size={12} className="text-[#f5c518]" />
              </div>

              {/* Bottom text */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-white font-semibold text-sm">{label}</p>
                <p className="text-white/40 text-xs mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FREE SCENARIO ─────────────────────────────────────────────────── */}
      <section className="px-4 md:px-8 py-12 max-w-5xl mx-auto">
        <div className="mb-8">
          <span className="text-[#f5c518] text-[10px] font-bold uppercase tracking-widest mb-3 block">
            Free Scenario
          </span>
          <h2 className="text-white font-bold text-2xl md:text-3xl leading-tight mb-3">
            Write your own story.<br />
            <span className="text-white/50">AI creates the character.</span>
          </h2>
          <p className="text-white/40 text-sm max-w-md">
            Describe any situation — job interview, doctor visit, travel — and practice it instantly with an AI character built for that exact moment.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sol: Örnek chip'ler */}
          <div className="flex flex-col gap-3">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-1">Example scenarios</p>
            {[
              "I'm interviewing for a senior product manager role at a tech startup.",
              "I need to explain to my landlord why my rent is late.",
              "I'm ordering food at a French restaurant and I don't speak French.",
              "I'm negotiating a salary raise with my manager.",
              "I need to reschedule a doctor's appointment.",
            ].map((example) => (
              <button
                key={example}
                onClick={() => setLandingScenarioText(example)}
                className="text-left px-4 py-3 rounded-xl bg-white/5 border border-white/8 text-white/60 text-sm hover:bg-white/8 hover:text-white/80 hover:border-white/15 transition-all"
              >
                {example}
              </button>
            ))}
          </div>

          {/* Sağ: Form */}
          <div className="bg-[#0d0d0d] border border-white/8 rounded-2xl p-6">
            <LandingScenarioForm
              value={landingScenarioText}
              onChange={setLandingScenarioText}
            />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="px-4 md:px-8 py-8 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-[#111] border border-white/6 px-6 py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: "120K+", label: T.stats.activeLearners },
              { value: "30+", label: T.stats.languages },
              { value: "4.9", label: T.stats.userRating, star: true },
            ].map(({ value, label, star }) => (
              <div key={label} className="flex flex-col items-center text-center">
                <span className="text-white font-bold text-xl">
                  {star && <span className="text-[#f5c518] mr-1">★</span>}
                  {value}
                </span>
                <span className="text-white/35 text-xs mt-0.5">{label}</span>
              </div>
            ))}
            {/* Community join */}
            <div className="flex flex-col items-center text-center">
              <div className="flex -space-x-1.5 mb-1">
                {CHARACTERS.slice(0, 3).map((c) => (
                  <div key={c.id} className="w-6 h-6 rounded-full border-2 border-[#111] overflow-hidden">
                    {c.photo ? (
                      <Image src={c.photo} alt={c.name} width={24} height={24} className="object-cover object-top w-full h-full" />
                    ) : (
                      <div className="w-full h-full" style={{ background: `radial-gradient(circle, ${c.color}60, ${c.color}20)` }} />
                    )}
                  </div>
                ))}
              </div>
              <Link href="/register" className="text-[#f5c518] text-xs font-semibold hover:underline">
                {T.stats.joinCommunity}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA STRIP ─────────────────────────────────────────────────────── */}
      <section className="px-4 md:px-8 py-10 max-w-5xl mx-auto">
        <div className="rounded-2xl border border-white/8 bg-[#111] p-10 text-center">
          {isLoggedIn ? (
            <>
              <h3 className="text-white text-2xl font-bold mb-2">{T.cta.loggedInHeading}</h3>
              <p className="text-white/40 text-sm mb-6">{T.cta.loggedInSub}</p>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#f5c518] text-[#080808] font-bold rounded-full hover:bg-[#f5c518]/90 transition-all text-sm"
              >
                {T.cta.loggedInBtn} <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <>
              <h3 className="text-white text-2xl font-bold mb-2">{T.cta.heading}</h3>
              <p className="text-white/40 text-sm mb-6">{T.cta.sub}</p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#f5c518] text-[#080808] font-bold rounded-full hover:bg-[#f5c518]/90 transition-all text-sm"
              >
                {T.cta.btn} <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/6 px-5 md:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
        <span className="text-white/25 text-sm font-bold">olalabs</span>
        <div className="flex items-center gap-6 text-white/25 text-xs">
          <Link href="/pricing" className="hover:text-white/50 transition-colors">{T.footer.pricing}</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="hover:text-white/50 transition-colors">{T.footer.dashboard}</Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-white/50 transition-colors">{T.footer.signIn}</Link>
              <Link href="/register" className="hover:text-white/50 transition-colors">{T.footer.register}</Link>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
