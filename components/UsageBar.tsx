"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface UsageData {
  plan: string;
  sessionsToday: number;
  sessionLimit: number;
  voiceSecondsToday: number;
  voiceLimit: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function UsageBar() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function fetchUsage() {
    fetch("/api/usage")
      .then((r) => {
        if (r.status === 401) {
          setLoggedIn(false);
          return null;
        }
        return r.json() as Promise<UsageData>;
      })
      .then((d) => {
        if (!d) return;
        setLoggedIn(true);
        setData(d);
      })
      .catch(() => {});
  }

  useEffect(() => {
    fetchUsage();
    intervalRef.current = setInterval(fetchUsage, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!loggedIn || !data) return null;

  const { plan, sessionsToday, sessionLimit, voiceSecondsToday, voiceLimit } = data;

  const voiceRemaining = voiceLimit === Infinity ? Infinity : Math.max(0, voiceLimit - voiceSecondsToday);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d0d]/95 backdrop-blur-sm border-t border-white/[0.08] h-[44px] flex items-center px-4 sm:px-6">
      <div className="flex items-center gap-4 sm:gap-5 text-white/50 text-xs w-full">

        {/* Sessions */}
        <span className="shrink-0">
          Sessions:{" "}
          <span className="text-white/70">
            {sessionLimit === Infinity ? "unlimited" : `${sessionsToday}/${sessionLimit} today`}
          </span>
        </span>

        {/* Voice — hidden on mobile */}
        <span className="hidden sm:inline shrink-0">
          Voice:{" "}
          <span className="text-white/70">
            {voiceLimit === Infinity
              ? "unlimited"
              : `${formatTime(voiceRemaining)} remaining`}
          </span>
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Plan badge / upgrade CTA */}
        {plan === "premium" ? (
          <span className="text-white/40 text-[11px] font-medium tracking-wide shrink-0">
            ✦ Premium
          </span>
        ) : plan === "pro" ? (
          <Link
            href="/dashboard#plans"
            className="text-[#f5c518] text-[11px] font-medium hover:text-[#f5c518]/80 transition-colors shrink-0"
          >
            Upgrade to Premium
          </Link>
        ) : (
          <Link
            href="/dashboard#plans"
            className="text-[#f5c518] text-[11px] font-medium hover:text-[#f5c518]/80 transition-colors shrink-0"
          >
            Upgrade to Pro
          </Link>
        )}
      </div>
    </div>
  );
}
