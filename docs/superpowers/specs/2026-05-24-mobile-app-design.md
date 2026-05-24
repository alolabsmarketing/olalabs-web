# OlaLabs Mobile App — Design Spec
Date: 2026-05-24

## Overview

Android-first React Native app with full feature parity to the web. Uses the existing Next.js API at `https://olalabs.io/api/*` with no new services. iOS comes later. Mobile-specific features (push notifications, etc.) follow after initial release.

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Expo SDK (latest) | Managed workflow, EAS Build for APK |
| Routing | Expo Router | File-based like Next.js App Router — familiar |
| Global state | Zustand | Auth + session state, minimal boilerplate |
| Server state | React Query | API cache, background refetch, no loading flicker |
| Audio record | expo-speech-recognition | Free Android built-in STT, no API key needed |
| Audio playback | expo-av | TTS playback from Azure via existing `/api/tts` |
| Token storage | expo-secure-store | Encrypted on-device storage for JWT tokens |
| Styling | NativeWind (Tailwind for RN) | Same utility classes as web |
| HTTP | Custom fetch wrapper | Adds `Authorization: Bearer` header automatically |

---

## Project Structure

```
olalabs-mobile/
├── app/
│   ├── _layout.tsx               # Root — auth guard, React Query provider
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── google-callback.tsx   # Deep link handler for Google OAuth
│   ├── (app)/
│   │   ├── _layout.tsx           # Tab bar (Dashboard, Pratik, Premium, Profil)
│   │   ├── index.tsx             # Dashboard
│   │   ├── practice/
│   │   │   ├── index.tsx         # Karakter + senaryo seçimi
│   │   │   └── session.tsx       # Aktif sohbet (tam ekran)
│   │   ├── pricing.tsx
│   │   └── profile.tsx
│   └── onboarding.tsx            # İlk girişte gösterilir, sonra (app)'e yönlendirir
├── lib/
│   ├── api.ts                    # fetch wrapper — Bearer header, token refresh
│   ├── plan.ts                   # Web'den kopyalanır (aynı dosya)
│   └── db-types.ts               # Web'den kopyalanır (aynı dosya)
├── stores/
│   ├── auth.store.ts             # token, userId, userPlan, isLoaded
│   └── session.store.ts          # characterId, scenarioId, sessionId, messages, isRecording
├── hooks/
│   ├── useProfile.ts             # React Query — /api/auth/me
│   ├── useScenarios.ts           # React Query — /api/scenarios
│   └── useDashboard.ts           # React Query — /api/dashboard
├── components/
│   ├── CharacterCard.tsx
│   ├── ScenarioItem.tsx
│   ├── MessageBubble.tsx
│   └── MicButton.tsx             # Büyük merkezi kayıt butonu
└── constants/
    └── colors.ts                 # #080808 dark tema renkleri
```

---

## Screens

### Auth Ekranları
- **Login:** Email + şifre formu, Google OAuth butonu, Register linki
- **Register:** Email + şifre + isim, Google OAuth butonu

### Onboarding
- Web ile aynı 3 soruluk otomatik seviye testi
- Tamamlanınca Dashboard'a yönlendirir, bir daha gösterilmez

### Dashboard (Tab 1)
- Streak, toplam saat, ortalama skor
- Karakter bazlı aktivite breakdown
- Plan kartları (upgrade butonu)
- React Query 2 dk cache — açılışta anında veri, arka planda yenileme

### Pratik Akışı (Tab 2)
```
Karakter seçimi (2x3 grid, kilitli karakterler badge'li)
  → Senaryo seçimi (kategorili liste)
    → Aktif sohbet (tam ekran)
      → Analiz modal (session bitince)
```

**Aktif sohbet ekranı:**
- Üstte karakter adı + süre sayacı
- Ortada mesaj listesi (streaming — kelimeler teker teker görünür)
- Altta büyük MicButton (bas-konuş) + yazı alanı
- Karakter yanıtı gelince otomatik TTS başlar

### Pricing (Tab 3)
- Web ile aynı plan kartları
- Stripe Checkout → in-app browser (WebView) ile açılır

### Profil (Tab 4)
- Kullanıcı bilgileri, dil ayarları, logout
- Abonelik durumu

---

## API Integration

### Yeni endpoint (backend'e eklenir): `POST /api/chat/stream`
Web'deki `/api/chat` ile aynı mantık, yanıt `ReadableStream` olarak döner:
```typescript
return new Response(stream, {
  headers: { "Content-Type": "text/plain; charset=utf-8" }
})
```
Mobil token token okur. Web de bu endpoint'i kullanabilir.

### Backend değişikliği: Login/Register response body
```typescript
// Mevcut: sadece httpOnly cookie set eder
// Eklenir: JSON body'de de token döner
return NextResponse.json({
  success: true,
  accessToken: token,
  refreshToken: refresh,
})
```
Web cookie'yi okur (değişmez). Mobil JSON'dan okur.

### API wrapper (`lib/api.ts`)
- Her istekte `Authorization: Bearer <token>` ekler
- 401 gelirse refresh token ile token yeniler, isteği tekrarlar
- İkinci 401'de logout + /login'e yönlendirir

---

## Authentication

### Email/Şifre
```
POST /api/auth/login → { accessToken, refreshToken }
  → SecureStore.setItem("access_token", ...)
  → SecureStore.setItem("refresh_token", ...)
  → authStore güncellenir
  → Dashboard'a yönlendirir
```

### Google OAuth
```
Expo AuthSession → accounts.google.com
  → Redirect: olalabs://auth/google-callback?code=...
  → /api/auth/google/callback → { accessToken, refreshToken }
  → SecureStore → authStore → Dashboard
```
Deep link `olalabs://` için `app.json`'da scheme tanımlanır.

### Token Yenileme
```
API isteği → 401 → refresh token ile Supabase refreshSession
  → Yeni token SecureStore'a yazılır → İstek tekrarlanır
```

---

## Audio

### STT (Speech-to-Text)
- `expo-speech-recognition` — Android built-in Google STT
- Mikrofon izni ilk kullanımda istenir
- Ses doğrudan metne çevrilir, sunucuya ses dosyası gönderilmez
- İleride `/api/stt` (Whisper) ile değiştirilebilir

### TTS (Text-to-Speech)
- Karakter yanıtı gelince `POST /api/tts` çağrılır
- `expo-av` ile audio buffer oynatılır
- Streaming ile metin gelirken TTS paralel başlatılabilir (v2)

---

## State Management

### Zustand Stores

**auth.store.ts**
```typescript
{ token, userId, userPlan, isLoaded }
// SecureStore'dan başlatılır (app açılışında)
// login/logout aksiyonları
```

**session.store.ts**
```typescript
{ characterId, scenarioId, sessionId, messages, isRecording, sessionStartedAt }
// Aktif pratik session'ı tutar
// Session bitince temizlenir
```

### React Query Cache
| Hook | Endpoint | Cache TTL |
|------|----------|-----------|
| `useProfile` | `/api/auth/me` | 5 dk |
| `useScenarios` | `/api/scenarios` | 5 dk |
| `useDashboard` | `/api/dashboard` (yeni) | 2 dk |
| `useCharacters` | local `characters.json` import | sonsuz (fetch yok) |

---

## Performance

| Teknik | Etki |
|--------|------|
| Streaming chat | Claude yanıtı bitmeden ekranda görünür |
| React Query cache | Dashboard açılışta beyaz ekran yok |
| Paralel TTS | Metin gelirken ses hazırlanır |
| SecureStore önbellek | Token her istekte diskten değil memory'den okunur |

---

## Backend Değişiklikleri (Özet)

| Değişiklik | Dosya | Etki |
|-----------|-------|------|
| Token JSON body'ye ekle | `/api/auth/login`, `/api/auth/register` | Mobil için gerekli, web etkilenmez |
| Streaming endpoint | `/api/chat/stream` (yeni) | Mobil + web performansı artar |
| Dashboard API | `/api/dashboard` (yeni) | Web'de server component, mobil için API gerekli |

---

## Build & Yayın

1. **Geliştirme:** Expo Go ile Android cihazda test
2. **APK:** `eas build --platform android --profile preview`
3. **Play Store:** `eas build --platform android --profile production` → AAB dosyası

`eas.json`:
```json
{
  "build": {
    "preview": { "android": { "buildType": "apk" } },
    "production": { "android": { "buildType": "app-bundle" } }
  }
}
```

---

## Kapsam Dışı (İlk Sürüm)

- iOS
- Push bildirimleri / streak reminder
- Offline mod
- Whisper STT
- In-app subscription (Stripe sadece web üzerinden)
