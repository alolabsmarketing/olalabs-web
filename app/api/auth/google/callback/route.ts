import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${origin}/login?error=cancelled`);
  }

  // Exchange authorization code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) {
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

  // Find existing user in profiles
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id, level, language")
    .eq("email", googleUser.email)
    .single();

  let userId: string;

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    // Create new Supabase user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: googleUser.email,
      email_confirm: true,
      user_metadata: {
        full_name: googleUser.name ?? "",
        avatar_url: googleUser.picture ?? "",
      },
    });
    if (createError || !newUser.user) {
      console.error("Google callback createUser error:", createError?.message);
      return NextResponse.redirect(`${origin}/login?error=user_creation_failed`);
    }
    userId = newUser.user.id;

    // Insert profile row for new Google user
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: userId,
      email: googleUser.email,
      plan: "free",
    });
    if (profileError) {
      console.error("Google callback profile insert error:", profileError.message);
    }
  }

  // Create a Supabase session for the user
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.createSession({ userId });
  if (sessionError || !sessionData?.session) {
    return NextResponse.redirect(`${origin}/login?error=session_failed`);
  }

  // Determine redirect destination
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("level, language")
    .eq("id", userId)
    .single();

  const lang = profile?.language === "tr" ? "tr" : "en";
  const redirectTo = !profile?.level ? "/onboarding" : "/dashboard";

  const res = NextResponse.redirect(`${origin}${redirectTo}`);

  res.cookies.set("sb-access-token", sessionData.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  res.cookies.set("sb-refresh-token", sessionData.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
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
}
