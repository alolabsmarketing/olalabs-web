import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { code, redirectUri } = await req.json();
    if (!code || !redirectUri) {
      return NextResponse.json({ error: "Missing code or redirectUri" }, { status: 400 });
    }

    const ALLOWED_REDIRECT_URIS = ["olalabs://auth/google-callback"];
    if (!ALLOWED_REDIRECT_URIS.includes(redirectUri)) {
      return NextResponse.json({ error: "Invalid redirectUri" }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return NextResponse.json({ error: "Google not configured" }, { status: 500 });
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenRes.json();
    if (!tokens.access_token) {
      return NextResponse.json({ error: "Google token exchange failed" }, { status: 400 });
    }

    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userInfoRes.json();
    if (!googleUser.email) {
      return NextResponse.json({ error: "No email from Google" }, { status: 400 });
    }

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, level")
      .eq("email", googleUser.email)
      .single();

    if (!existingProfile) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: googleUser.email,
        email_confirm: true,
        user_metadata: { full_name: googleUser.name ?? "", avatar_url: googleUser.picture ?? "" },
      });
      if (createError || !newUser.user) {
        return NextResponse.json({ error: "User creation failed" }, { status: 500 });
      }
      const { error: profileInsertError } = await supabaseAdmin.from("profiles").insert({
        id: newUser.user.id,
        email: googleUser.email,
        plan: "free",
      });
      if (profileInsertError) {
        console.error("profile insert error:", profileInsertError.message);
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        return NextResponse.json({ error: "Account setup failed" }, { status: 500 });
      }
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: googleUser.email,
    });
    if (linkError || !linkData?.properties?.hashed_token) {
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
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
      return NextResponse.json({ error: "OTP verification failed" }, { status: 500 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("level")
      .eq("email", googleUser.email)
      .single();

    return NextResponse.json({
      accessToken: verifyData.session.access_token,
      refreshToken: verifyData.session.refresh_token,
      needsOnboarding: !profile?.level,
    });
  } catch (e) {
    console.error("Google mobile callback error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
