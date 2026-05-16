# Google OAuth + Onboarding — Design Spec

**Tarih:** 2026-05-16
**Durum:** Onaylandı

## Amaç

Login ve register sayfalarına "Google ile devam et" butonu eklemek. Google ile ilk kez kayıt olan kullanıcılara seviye ve hedef soran kısa bir onboarding ekranı göstermek. Mevcut email/password akışı korunacak.

## Yaklaşım

Supabase'in yerleşik `signInWithOAuth` metodu kullanılacak. Apple desteği eklenmeyecek (şimdilik). Mevcut custom cookie sistemi (`sb-access-token` / `sb-refresh-token`) ve `proxy.ts` değişmeyecek — OAuth'tan gelen session aynı cookie'lere yazılacak.

## Auth Akışı

```
Kullanıcı "Google ile devam et"e tıklar
  → client: supabase.signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback' })
  → Google onay sayfasına yönlendir
  → Kullanıcı onaylar → /auth/callback?code=xxx
  → callback page: supabase.auth.exchangeCodeForSession(code)
  → session alınır → POST /api/auth/callback (access_token, refresh_token)
  → API route: sb-access-token + sb-refresh-token cookie'ye yazar
  → profiles.level IS NULL → /onboarding
  → profiles.level dolu → /dashboard
```

## Veritabanı Değişikliği

`profiles` tablosuna 2 kolon eklenir:

```sql
alter table public.profiles
  add column level text check (level in ('beginner', 'intermediate', 'advanced')),
  add column goal  text check (goal  in ('travel', 'work', 'casual', 'exam'));
```

`onboarding_completed` boolean'ı eklenmez — `level IS NULL` onboarding göstergesi olarak kullanılır.

## Yeni Dosyalar

| Dosya | Görev |
|---|---|
| `app/auth/callback/page.tsx` | OAuth code → session exchange, cookie set için API'ye POST atar, yönlendirir |
| `app/api/auth/callback/route.ts` | access_token + refresh_token alır, httpOnly cookie'lere yazar |
| `app/onboarding/page.tsx` | Seviye + hedef seçim ekranı, PATCH /api/onboarding çağırır |
| `app/api/onboarding/route.ts` | profiles tablosunda level + goal günceller |

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|---|---|
| `app/(auth)/login/page.tsx` | Google butonu + "veya" ayracı eklenir, form aşağı kalır |
| `app/(auth)/register/page.tsx` | Aynı Google butonu eklenir |
| `proxy.ts` | `/onboarding` korumalı route listesine eklenir |
| `supabase/migrations/` | `level` ve `goal` kolonları için yeni migration |

## Onboarding Sayfası

- Yalnızca `profiles.level IS NULL` olan kullanıcılara gösterilir (her OAuth/email kayıtta)
- İki bölüm: Seviye (3 seçenek) + Hedef (4 seçenek)
- "Başla" → seçilen değerleri kaydeder → `/dashboard`
- "Şimdilik atla" → değer kaydetmeden direkt `/dashboard`
- Scroll olmayacak şekilde tek ekrana sığar

## Google Butonu UI

Her iki auth sayfasında aynı şekilde:

```
[Google SVG logo]  Google ile devam et
────────── veya ──────────
[mevcut email/password formu]
```

Beyaz arka plan, koyu metin — mevcut "Sign in" butonu ile aynı stil.

## Supabase Dashboard Konfigürasyonu

Implementasyon öncesinde yapılması gerekenler:
- Supabase Dashboard → Authentication → Providers → Google → Enable
- Google Cloud Console'dan OAuth 2.0 Client ID + Secret alınır
- Authorized redirect URI: `https://[supabase-project].supabase.co/auth/v1/callback`
- Vercel env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zaten mevcut)

## Kapsam Dışı

- Apple Sign In (sonraki aşama)
- Mevcut (zaten kayıtlı) kullanıcılara onboarding gösterme — sadece `level IS NULL` olan yeni kayıtlar görür, bu Google ve email/password ikisini de kapsar
- Profil ayarları sayfasından level/goal güncelleme (sonraki aşama)
- Günlük pratik hedefi, ana dil, karakter tercihi alanları (profil ayarları kapsamında)
