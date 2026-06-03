import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);

  try {
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error || !code) {
      return NextResponse.redirect(`${origin}/login?error=cancelled`);
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("Google callback: missing env vars");
      return NextResponse.redirect(`${origin}/login?error=google_not_configured`);
    }

    // Exchange authorization code for Google tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    console.log("Google token exchange:", tokenRes.status, tokens.error ?? "ok");

    if (!tokens.access_token) {
      console.error("Google token exchange failed:", JSON.stringify(tokens));
      return NextResponse.redirect(`${origin}/login?error=token_failed`);
    }

    // Get user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${origin}/login?error=no_email`);
    }

    console.log("Google user:", googleUser.email);

    // Find or create user in Supabase
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, level, language")
      .eq("email", googleUser.email)
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: {
          full_name: googleUser.name ?? "",
          avatar_url: googleUser.picture ?? "",
        },
      });
      if (createError || !newUser.user) {
        console.error("createUser error:", createError?.message);
        return NextResponse.redirect(`${origin}/login?error=user_creation_failed`);
      }
      userId = newUser.user.id;

      const { error: profileError } = await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: googleUser.email,
        plan: "free",
      });
      if (profileError) console.error("profile insert error:", profileError.message);
    }

    // Generate a magic link token and immediately verify it to get a session
    // (replaces unreliable admin.createSession)
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: googleUser.email,
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error("generateLink error:", linkError?.message);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: verifyData, error: verifyError } = await anonClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError || !verifyData.session) {
      console.error("verifyOtp error:", verifyError?.message);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    const { access_token, refresh_token } = verifyData.session;

    // Determine redirect destination
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("level, language")
      .eq("id", userId)
      .single();

    // Mobile flow: redirect back to app via deep link
    const state = searchParams.get("state");
    if (state === "mobile") {
      const needsOnboarding = !profile?.level ? "1" : "0";
      const deepLink = `olalabs://auth/callback?access_token=${encodeURIComponent(access_token)}&refresh_token=${encodeURIComponent(refresh_token)}&needs_onboarding=${needsOnboarding}`;
      return NextResponse.redirect(deepLink);
    }

    const lang = profile?.language === "tr" ? "tr" : "en";
    const redirectTo = !profile?.level ? "/onboarding" : "/dashboard";

    const res = NextResponse.redirect(`${origin}${redirectTo}`);
    res.cookies.set("sb-access-token", access_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.set("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    res.cookies.set("lang", lang, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });

    return res;

  } catch (e) {
    console.error("Google callback unhandled exception:", e);
    return NextResponse.redirect(`${origin}/login?error=session_failed`);
  }
}
