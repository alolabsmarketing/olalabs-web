"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    async function handleCallback() {
      const code = searchParams.get("code");
      if (!code) {
        router.replace("/login?error=missing_code");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error || !data.session) {
        router.replace("/login?error=oauth_failed");
        return;
      }

      const { access_token, refresh_token, user } = data.session;

      const cookieRes = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token, refresh_token }),
      });
      if (!cookieRes.ok) {
        router.replace("/login?error=cookie_failed");
        return;
      }

      // Yeni kullanıcı mı kontrol et (level IS NULL)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile query failed:", profileError);
        router.replace("/login?error=profile_check_failed");
        return;
      }

      if (!profile?.level) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="ola-gradient-bg flex min-h-screen items-center justify-center">
      <div className="ola-wave" />
      <div className="relative z-10 text-center">
        <p className="text-white/60 text-sm animate-pulse">Giriş yapılıyor...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="ola-gradient-bg flex min-h-screen items-center justify-center">
          <div className="ola-wave" />
          <div className="relative z-10 text-center">
            <p className="text-white/60 text-sm animate-pulse">Giriş yapılıyor...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
