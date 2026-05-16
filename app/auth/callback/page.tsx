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

      let sessionTokens: { access_token: string; refresh_token: string; user_id: string } | null = null;

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.session) {
          router.replace("/login?error=oauth_failed");
          return;
        }
        sessionTokens = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user_id: data.session.user.id,
        };
      } else {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session) {
          router.replace("/login?error=oauth_failed");
          return;
        }
        sessionTokens = {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          user_id: data.session.user.id,
        };
      }

      const cookieRes = await fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: sessionTokens.access_token,
          refresh_token: sessionTokens.refresh_token,
        }),
      });

      if (!cookieRes.ok) {
        router.replace("/login?error=cookie_failed");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("level, language")
        .eq("id", sessionTokens.user_id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Profile query failed:", profileError);
        router.replace("/login?error=profile_check_failed");
        return;
      }

      const lang = profile?.language ?? "en";
      document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

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
        <p className="text-white/60 text-sm animate-pulse">Signing in...</p>
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
            <p className="text-white/60 text-sm animate-pulse">Signing in...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
