# Phase 1: Temel Altyapı — Design Spec

**Tarih:** 2026-05-09
**Durum:** Onaylandı

## Amaç

OlaLabs'in production'a hazır hale gelmesi için kritik altyapı eklemek:
- Veritabanı şeması (session/mesaj kaydı)
- Auth middleware (korumalı route'lar)
- Session & analiz sonuçlarının DB'ye kaydedilmesi
- Profil dropdown + logout
- Temel profil sayfası

## Mimari

Mevcut özel auth sistemi (sb-access-token cookie) korunur — @supabase/ssr'e geçiş Phase 2'ye bırakılır. Middleware bu cookie'yi okur. API route'lar `supabaseAdmin.auth.getUser(token)` ile kullanıcıyı doğrular.

## Veritabanı Şeması

```
auth.users (Supabase managed)
  └── public.profiles (1:1)
  └── public.sessions (1:N)
        └── public.messages (1:N)
        └── public.analysis_results (1:1)
```

## Korumalı Route'lar

`/dashboard`, `/practice`, `/profile`, `/characters` → giriş yoksa `/login`
`/login`, `/register` → giriş varsa `/dashboard`

## Session Kaydı Akışı

1. Practice sayfası `isInitial=true` ile chat API'ye istek atar
2. Chat API session oluşturur, `sessionId` döner
3. Practice sayfası sessionId'yi state'te tutar
4. Her sonraki mesajda `sessionId` de gönderilir
5. Chat API her kullanıcı + asistan mesaj çiftini DB'ye kaydeder
6. Analysis tamamlandığında `sessionId` ile `analysis_results`'a kayıt atılır

## Yeni Dosyalar

- `supabase/migrations/001_initial_schema.sql`
- `middleware.ts`
- `lib/auth-server.ts` — token'dan userId çıkarma
- `app/api/sessions/route.ts`
- `app/api/sessions/[id]/route.ts`
- `components/ProfileDropdown.tsx`
- `app/profile/page.tsx`

## Değiştirilen Dosyalar

- `app/api/chat/route.ts` — session oluşturma + mesaj kayıt
- `app/api/analysis/route.ts` — analiz sonucu kayıt
- `app/dashboard/page.tsx` — gerçek istatistikler + ProfileDropdown
- `app/practice/page.tsx` — sessionId state'i + gönderimi
