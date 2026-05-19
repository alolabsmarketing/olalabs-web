export interface LanguageOption {
  code: string
  name: string
  flag: string
  available: boolean
}

export const NATIVE_LANGUAGES: LanguageOption[] = [
  { code: 'tr', name: 'Türkçe',    flag: '🇹🇷', available: true },
  { code: 'ar', name: 'العربية',   flag: '🇸🇦', available: true },
  { code: 'es', name: 'Español',   flag: '🇪🇸', available: true },
  { code: 'fr', name: 'Français',  flag: '🇫🇷', available: true },
  { code: 'de', name: 'Deutsch',   flag: '🇩🇪', available: true },
  { code: 'it', name: 'Italiano',  flag: '🇮🇹', available: true },
  { code: 'pt', name: 'Português', flag: '🇵🇹', available: true },
  { code: 'ru', name: 'Русский',   flag: '🇷🇺', available: true },
  { code: 'zh', name: '中文',       flag: '🇨🇳', available: true },
  { code: 'ja', name: '日本語',     flag: '🇯🇵', available: true },
  { code: 'ko', name: '한국어',     flag: '🇰🇷', available: true },
]

export const PRACTICE_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English',  flag: '🇬🇧', available: true },
  { code: 'fr', name: 'Français', flag: '🇫🇷', available: false },
  { code: 'de', name: 'Deutsch',  flag: '🇩🇪', available: false },
  { code: 'es', name: 'Español',  flag: '🇪🇸', available: false },
]
