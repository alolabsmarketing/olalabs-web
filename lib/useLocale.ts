"use client";

import { useState, useEffect, useCallback } from "react";
import { parseLang, type Lang } from "./i18n";

const LOCALE_STORAGE_KEY = "ola_locale";
const LOCALE_COOKIE_NAME = "NEXT_LOCALE";

function readStoredLocale(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    return parseLang(stored);
  } catch {
    return "en";
  }
}

function writeLocale(lang: Lang): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, lang);
    // Also write cookie so server components can read it
    document.cookie = `${LOCALE_COOKIE_NAME}=${lang}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Storage access may be blocked in some environments
  }
}

export function useLocale() {
  const [lang, setLangState] = useState<Lang>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    setLangState(stored);
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang: Lang) => {
    writeLocale(newLang);
    setLangState(newLang);
  }, []);

  return { lang, setLang, mounted };
}
