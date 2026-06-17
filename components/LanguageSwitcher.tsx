"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SUPPORTED_LANGS, type Lang } from "@/lib/i18n";
import { useLocale } from "@/lib/useLocale";

interface LanguageSwitcherProps {
  /** Compact mode: shows only flag + code (default: false — shows flag + full label) */
  compact?: boolean;
  /** className to apply to the trigger button wrapper */
  className?: string;
}

export function LanguageSwitcher({ compact = false, className = "" }: LanguageSwitcherProps) {
  const { lang, setLang, mounted } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!mounted) {
    // Render a placeholder during SSR to avoid hydration mismatch
    return (
      <div className={`flex items-center gap-1 text-white/30 text-xs ${className}`}>
        <span>🌐</span>
        {!compact && <span>EN</span>}
      </div>
    );
  }

  const current = SUPPORTED_LANGS.find((l) => l.code === lang) ?? SUPPORTED_LANGS[0];

  function handleSelect(code: Lang) {
    setLang(code);
    setOpen(false);
    // Reload to apply new locale across server components
    window.location.reload();
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs transition-colors"
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        {!compact && <span className="uppercase font-semibold tracking-wide">{current.code.toUpperCase()}</span>}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-40 rounded-xl bg-[#1a1a1a] border border-white/10 py-1 shadow-xl z-50"
        >
          {SUPPORTED_LANGS.map((l) => (
            <button
              key={l.code}
              role="option"
              aria-selected={l.code === lang}
              onClick={() => handleSelect(l.code)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                l.code === lang
                  ? "text-white bg-white/8"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && (
                <span className="ml-auto text-[#f5c518] text-xs">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
