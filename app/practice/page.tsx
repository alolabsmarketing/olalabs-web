"use client";

import { useState, useRef, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CHARACTERS } from "@/lib/characters";
import { cn } from "@/lib/utils";
import { translations, parseLang } from "@/lib/i18n";
import { Send, Mic, MicOff, ArrowLeft, BarChart2, Volume2, VolumeX, Square, RotateCcw } from "lucide-react";
import UpgradeModal, { type UpgradeReason } from "@/components/UpgradeModal";
import { getPlanLimits, PLAN_LIMITS } from "@/lib/plan";
import UsageBar from "@/components/UsageBar";

function useLang() {
  return useMemo(() => {
    if (typeof document === "undefined") return parseLang("en");
    const match = document.cookie.match(/(?:^|;\s*)lang=([^;]+)/);
    return parseLang(match?.[1]);
  }, []);
}

function CharacterDot({ characterId, size, className }: { characterId: string; size: number; className?: string }) {
  const char = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  return char.photo ? (
    <div className={cn("rounded-full flex-shrink-0 overflow-hidden", className)} style={{ width: size, height: size }}>
      <Image src={char.photo} alt={char.name} width={size} height={size} loading="eager" className="object-cover object-top w-full h-full" />
    </div>
  ) : (
    <div
      className={cn("rounded-full flex-shrink-0", className)}
      style={{ width: size, height: size, background: `radial-gradient(circle at 38% 35%, ${char.color}80, ${char.color}20)` }}
    />
  );
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

function VoiceWave({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-1 h-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-150",
            active ? "bg-blue-400" : "bg-white/30"
          )}
          style={{
            height: active ? `${8 + Math.sin(i * 1.2) * 14 + 8}px` : "6px",
            animation: active ? `wave-bar ${0.4 + i * 0.1}s ease-in-out infinite alternate` : "none",
          }}
        />
      ))}
      <style>{`
        @keyframes wave-bar {
          from { height: 4px; }
          to { height: 22px; }
        }
      `}</style>
    </div>
  );
}

interface ScenarioCharacter {
  name: string;
  role: string;
  personality: string;
  systemPrompt: string;
}

function PracticeContent() {
  const searchParams = useSearchParams();
  const characterParam = searchParams.get("character");
  const characterId = characterParam ?? "ethan";
  const customCharacterId = searchParams.get("customCharacter") ?? null;
  const autoMode = searchParams.get("auto") === "true";
  const scenarioMode = searchParams.get("scenarioMode") === "true";
  const scenarioCharacterParam = searchParams.get("scenarioCharacter");
  const scenarioCharacter: ScenarioCharacter | null = (() => {
    if (!scenarioCharacterParam) return null;
    try { return JSON.parse(decodeURIComponent(scenarioCharacterParam)) as ScenarioCharacter; }
    catch { return null; }
  })();
  const character = CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  const lang = useLang();
  const T = translations[lang].practice;
  const router = useRouter();

  useEffect(() => {
    if (!characterParam && !scenarioMode) router.replace("/dashboard");
  }, [characterParam, scenarioMode, router]);

  const DEMO_LIMIT = 3;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState(autoMode);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [scenario, setScenario] = useState("");
  // Scenario selection removed — characters start directly without scene selection
  const [scenarioSet, setScenarioSet] = useState(true);
  const [scenarioTimeUp, setScenarioTimeUp] = useState(false);
  const [scenarioPlan, setScenarioPlan] = useState<string>("free");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null = auth check pending
  const [demoCount, setDemoCount] = useState(0);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<UpgradeReason | null>(null);

  // Memory update on unload for custom characters
  useEffect(() => {
    if (!customCharacterId || !sessionId) return;
    const handler = () => {
      fetch(`/api/characters/custom/${customCharacterId}/memory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [customCharacterId, sessionId]);
  const [canAnalyze, setCanAnalyze] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setIsLoggedIn(d.loggedIn);
        if (d.loggedIn) {
          const limits = getPlanLimits(d.plan);
          setCanAnalyze(limits.hasAnalysis);
          setScenarioPlan(d.plan ?? "free");
        } else {
          const stored = parseInt(localStorage.getItem("ola_demo_count") ?? "0", 10);
          setDemoCount(stored);
          if (stored >= DEMO_LIMIT) setShowDemoModal(true);
        }
      })
      .catch(() => setIsLoggedIn(false));
  }, []);

  // Scenario session duration enforcement
  useEffect(() => {
    if (!scenarioMode || !scenarioCharacter) return;
    const plan = scenarioPlan as "free" | "pro" | "premium";
    const durationSec = PLAN_LIMITS[plan]?.scenarioDuration ?? 120;
    if (!isFinite(durationSec)) return;
    const timer = setTimeout(() => {
      setScenarioTimeUp(true);
      setSessionEnded(true);
    }, durationSec * 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioMode, scenarioPlan, initialized]);

  const sendInitialGreeting = useCallback(async () => {
    if (initialized) return;
    setInitialized(true);
    setLoading(true);
    try {
      const body = scenarioCharacter
        ? { scenarioCharacter, messages: [], isInitial: true }
        : { characterId, customCharacterId, scenario, messages: [], isInitial: true };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        if (err.error === "CHARACTER_LOCKED") { setUpgradeReason("locked_character"); return; }
        setMessages([{ role: "assistant", content: T.errorMsg }]);
        return;
      }
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
      const content: string = data.content ?? T.errorMsg;
      const greeting: Message = { role: "assistant", content };
      setMessages([greeting]);
      // Don't auto-play initial greeting — no user interaction yet (browser autoplay policy)
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characterId, scenario, initialized, scenarioCharacter]);

  useEffect(() => {
    if (scenarioSet && !initialized) {
      sendInitialGreeting();
    }
  }, [scenarioSet, initialized, sendInitialGreeting]);


  function cleanTextForTTS(text: string): string {
    return text
      .replace(/\p{Emoji_Presentation}/gu, "")
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/→/g, "becomes")
      .replace(/\s*—\s*/g, ", ")
      .replace(/★|📝|✅|💡|🔥|✨/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  function speakWithBrowser(text: string) {
    if (!("speechSynthesis" in window)) { setIsSpeaking(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = character.tts.lang ?? "en-US";
    utterance.rate = character.tts.rate ?? 1.0;
    utterance.pitch = character.tts.pitch ?? 1.0;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Microsoft"))
    ) || voices.find((v) => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function speakText(text: string) {
    const cleaned = cleanTextForTTS(text);
    if (!cleaned) return;
    stopAudio();
    setIsSpeaking(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleaned, characterId }),
      });
      if (!res.ok) {
        if (res.status === 403) {
          const err = await res.json().catch(() => ({})) as { error?: string };
          if (err.error === "VOICE_LIMIT") { setUpgradeReason("voice_limit"); setIsSpeaking(false); return; }
        }
        speakWithBrowser(cleaned);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); audioRef.current = null; };
      await audio.play().catch(() => { speakWithBrowser(cleaned); });
    } catch {
      speakWithBrowser(cleaned);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    if (isLoggedIn === null) return; // auth check still pending
    if (isLoggedIn === false && demoCount >= DEMO_LIMIT) {
      setShowDemoModal(true);
      return;
    }
    const userMsg: Message = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const msgBody = scenarioCharacter
        ? { scenarioCharacter, messages: updated, sessionId }
        : { characterId, customCharacterId, scenario, messages: updated, sessionId };
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgBody),
      });
      const data = await res.json();
      const content: string =
        !res.ok || !data.content
          ? T.errorMsg
          : data.content;
      const aiMsg: Message = { role: "assistant", content };
      setMessages([...updated, aiMsg]);
      if (ttsEnabled && data.content) speakText(data.content);
      if (isLoggedIn === false) {
        const newCount = demoCount + 1;
        setDemoCount(newCount);
        localStorage.setItem("ola_demo_count", String(newCount));
        if (newCount >= DEMO_LIMIT) setShowDemoModal(true);
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleListening() {
    if (!("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
      alert("Your browser doesn't support voice input. Try Chrome.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setListening(false);
      sendMessage(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    stopAudio();
    recognition.start();
    setListening(true);
  }

  async function requestAnalysis() {
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, sessionId }),
      });
      const data = await res.json();
      setAnalysis(data);
      setShowAnalysis(true);
    } finally {
      setAnalysisLoading(false);
    }
  }

  /* ── Main practice screen ── */
  return (
    <div className="bg-[#080808] flex flex-col min-h-screen">

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-white/60 hover:text-white transition-colors mr-1">
            <ArrowLeft size={18} />
          </Link>
          {scenarioMode && scenarioCharacter ? (
            <div
              className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center bg-white/10 border border-white/15 text-white/60 text-sm font-semibold"
            >
              {scenarioCharacter.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <CharacterDot characterId={character.id} size={36} />
          )}
          <div>
            <p className="text-white font-semibold text-sm leading-tight">
              {scenarioMode && scenarioCharacter ? scenarioCharacter.name : character.name}
            </p>
            <div className="flex items-center gap-1.5">
              <p className="text-white/40 text-xs">
                {scenarioMode && scenarioCharacter ? scenarioCharacter.role : character.role}
              </p>
              {isSpeaking && (
                <span className="text-blue-400 text-xs flex items-center gap-1">
                  <Volume2 size={10} /> {T.speakingBadge}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={stopAudio}
              title="Stop speaking"
              className="p-2 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-all"
            >
              <Square size={14} fill="currentColor" />
            </button>
          )}
          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            title={ttsEnabled ? "Mute AI voice" : "Unmute AI voice"}
            className={cn(
              "p-2 rounded-full transition-all",
              ttsEnabled ? "glass-pill text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>

          {messages.length >= 4 && canAnalyze && (
            <button
              onClick={requestAnalysis}
              disabled={analysisLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill text-white/70 hover:text-white text-xs font-medium transition-all"
            >
              <BarChart2 size={12} />
              {analysisLoading ? T.analyzing : T.analyzeSession}
            </button>
          )}
          {messages.length >= 4 && !canAnalyze && isLoggedIn && (
            <button
              onClick={() => setUpgradeReason("voice_limit")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill text-white/40 hover:text-white/60 text-xs font-medium transition-all"
            >
              <BarChart2 size={12} />
              Analyze (Pro)
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => {
                stopAudio();
                setMessages([]);
                setSessionId(null);
                setInitialized(false);
                setAnalysis(null);
                setShowAnalysis(false);
                setSessionEnded(false);
              }}
              title="New session"
              className="p-2 rounded-full glass-pill text-white/50 hover:text-white transition-all"
            >
              <RotateCcw size={14} />
            </button>
          )}
        </div>
      </header>

      {/* Voice mode: large avatar + waveform */}
      {voiceMode && (
        <div className="relative z-10 flex flex-col items-center pt-8 pb-4 border-b border-white/10">
          <div
            className="mb-4"
            style={{
              boxShadow: isSpeaking ? `0 0 50px rgba(139,92,246,0.5)` : "none",
              borderRadius: "9999px",
              transition: "box-shadow 0.3s ease",
            }}
          >
            <CharacterDot characterId={character.id} size={120} />
          </div>
          <VoiceWave active={isSpeaking || listening} />
          <p className="text-white/40 text-xs mt-2">
            {listening ? T.listening : isSpeaking ? T.speakingLabel(character.name) : T.tapToSpeak}
          </p>
        </div>
      )}

      {/* Messages transcript */}
      <main className="relative z-10 flex-1 overflow-y-auto px-4 py-5 space-y-4 max-w-2xl mx-auto w-full">
        {scenario && (
          <div className="text-center py-1">
            <span className="glass-pill text-white/50 text-xs px-3 py-1">
              Scenario: {scenario}
            </span>
          </div>
        )}

        {messages.length === 0 && loading && (
          <div className="flex justify-center pt-8">
            <div className="glass-pill px-4 py-2 text-white/50 text-sm flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              {T.preparing(character.name)}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
            {msg.role === "assistant" && (
              <CharacterDot characterId={character.id} size={32} className="mr-2 mt-1" />
            )}
            <div className="flex flex-col gap-1 max-w-[78%]">
              <div
                className={cn(
                  "px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user" ? "chat-bubble-user text-white" : "chat-bubble-ai",
                  msg.role === "assistant" && msg.content.startsWith("[Connection error")
                    ? "text-red-400/80"
                    : "text-white"
                )}
              >
                {msg.content}
              </div>
              {msg.role === "assistant" && ttsEnabled && !msg.content.startsWith("[Connection error") && (
                <button
                  onClick={() => speakText(msg.content)}
                  className="self-start ml-1 flex items-center gap-1 text-white/30 hover:text-white/70 text-xs transition-colors"
                  title="Play audio"
                >
                  <Volume2 size={11} /> {T.hear}
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex justify-start items-end gap-2">
            <CharacterDot characterId={character.id} size={32} />
            <div className="chat-bubble-ai px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* Demo counter */}
      {isLoggedIn === false && (
        <div className="relative z-10 flex justify-center pb-1">
          <span className="text-white/30 text-xs">
            {demoCount >= DEMO_LIMIT
              ? `${T.demoExhausted} — `
              : `${T.demoLeft(DEMO_LIMIT - demoCount)} — `}
            <a href="/register" className="text-blue-400 hover:text-blue-300">{T.demoCreate}</a>
          </span>
        </div>
      )}

      {/* Scenario time-up banner */}
      {scenarioTimeUp && (
        <div className="relative z-10 mx-4 mb-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center max-w-2xl mx-auto">
          <p className="text-amber-300 text-sm font-medium">
            {scenarioPlan === "free"
              ? "Your 2-minute scenario has ended."
              : "Your scenario session has ended."}
            {" "}
            {scenarioPlan === "free" && (
              <a href="/dashboard#plans" className="underline hover:text-amber-200">Upgrade to continue.</a>
            )}
          </p>
        </div>
      )}

      {/* Input area */}
      <footer className="relative z-10 px-4 pb-5 pt-3 max-w-2xl mx-auto w-full">
        {sessionEnded && scenarioTimeUp ? (
          <div className="flex items-center justify-center gap-3 py-3">
            <a
              href="/dashboard"
              className="px-5 py-2.5 rounded-xl bg-white/8 border border-white/12 text-white/60 text-sm hover:bg-white/12 transition-all"
            >
              Back to Dashboard
            </a>
            <a
              href="/dashboard#plans"
              className="px-5 py-2.5 rounded-xl bg-white text-[#07112b] text-sm font-semibold hover:bg-white/90 transition-all"
            >
              Upgrade
            </a>
          </div>
        ) : voiceMode ? (
          /* Voice controls */
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={toggleListening}
              disabled={loading || isSpeaking || sessionEnded}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg",
                listening
                  ? "bg-red-500 scale-110 shadow-red-500/40"
                  : loading || isSpeaking
                  ? "bg-white/10 cursor-not-allowed"
                  : "bg-white hover:scale-105 active:scale-95"
              )}
              style={
                !listening && !loading && !isSpeaking
                  ? { boxShadow: `0 0 24px ${character.color}60` }
                  : {}
              }
            >
              {listening ? (
                <MicOff size={24} className="text-white" />
              ) : (
                <Mic size={24} className={loading || isSpeaking ? "text-white/30" : "text-[#07112b]"} />
              )}
            </button>
            <p className="text-white/40 text-xs">
              {listening ? T.listenStop : T.listenStart}
            </p>

            {/* Text fallback in voice mode */}
            <div className="flex w-full gap-2 mt-1">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); sendMessage(input); }
                }}
                placeholder={T.orType}
                className="flex-1 bg-white/8 border border-white/15 rounded-xl px-3 py-2 text-white placeholder:text-white/25 focus:outline-none text-xs"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading || sessionEnded}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 transition-all"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>

            <button
              onClick={() => setVoiceMode(false)}
              className="text-white/30 hover:text-white/60 text-xs transition-colors"
            >
              {T.switchToText}
            </button>
          </div>
        ) : (
          /* Text mode */
          <div className="flex gap-2 items-end">
            <div className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-4 py-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder={`Message ${scenarioMode && scenarioCharacter ? scenarioCharacter.name : character.name}...`}
                rows={1}
                className="w-full bg-transparent text-white placeholder:text-white/30 focus:outline-none text-sm resize-none"
                style={{ fieldSizing: "content" } as React.CSSProperties}
              />
            </div>
            <button
              onClick={() => setVoiceMode(true)}
              title="Switch to voice"
              className="w-11 h-11 rounded-full glass-pill flex items-center justify-center text-white/60 hover:text-white transition-all flex-shrink-0"
            >
              <Mic size={16} />
            </button>
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading || isLoggedIn === null || sessionEnded}
              className="w-11 h-11 rounded-full bg-white flex items-center justify-center hover:bg-white/90 transition-all disabled:opacity-40 flex-shrink-0"
            >
              <Send size={16} className="text-[#07112b]" />
            </button>
          </div>
        )}
      </footer>

      {/* Demo limit modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass-card p-8 max-w-sm w-full text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-white font-bold text-xl mb-2">{T.modalTitle}</h3>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              {T.modalSubtitle}
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/register"
                className="w-full py-3 rounded-xl bg-white text-[#07112b] font-bold text-sm hover:bg-white/90 transition-all text-center block"
              >
                {T.modalCreate}
              </a>
              <a
                href="/login"
                className="w-full py-3 rounded-xl bg-white/10 text-white font-medium text-sm hover:bg-white/15 transition-all text-center block"
              >
                {T.modalSignIn}
              </a>
            </div>
          </div>
        </div>
      )}

      {upgradeReason && (
        <UpgradeModal reason={upgradeReason} onClose={() => setUpgradeReason(null)} />
      )}

      {/* Analysis modal */}
      {showAnalysis && analysis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">{T.sessionAnalysis}</h3>
              <button onClick={() => setShowAnalysis(false)} className="text-white/50 hover:text-white text-xl leading-none">✕</button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: T.grammar, key: "grammar_score" },
                { label: T.vocabulary, key: "vocabulary_score" },
                { label: T.fluency, key: "fluency_score" },
              ].map(({ label, key }) => (
                <div key={key} className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                  <p className="text-white font-bold text-2xl">{String(analysis[key] ?? "—")}</p>
                  <p className="text-white/50 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {(analysis.grammar_errors as unknown[])?.length > 0 && (
              <div className="mb-5">
                <p className="text-white/70 text-sm font-medium mb-2">{T.grammarCorrections}</p>
                <div className="space-y-2">
                  {(analysis.grammar_errors as Array<{ original: string; corrected: string; explanation: string }>).map((e, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3 text-xs border border-white/8">
                      <p>
                        <span className="text-red-400 line-through">{e.original}</span>
                        <span className="text-white/40 mx-2">→</span>
                        <span className="text-green-400">{e.corrected}</span>
                      </p>
                      <p className="text-white/50 mt-1">{e.explanation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(analysis.tips as string[])?.length > 0 && (
              <div className="mb-4">
                <p className="text-white/70 text-sm font-medium mb-2">{T.improvementTips}</p>
                <ul className="space-y-2">
                  {(analysis.tips as string[]).map((tip, i) => (
                    <li key={i} className="flex gap-2 text-xs text-white/70">
                      <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!!analysis.summary && (
              <p className="text-white/50 text-xs border-t border-white/10 pt-4">{String(analysis.summary)}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <>
      <Suspense fallback={
        <div className="bg-[#080808] flex items-center justify-center min-h-screen">
          <div className="text-white/50 text-sm">Loading...</div>
        </div>
      }>
        <PracticeContent />
      </Suspense>
      <UsageBar />
    </>
  );
}
