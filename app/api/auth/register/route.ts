import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    // Create user via admin (skips email confirmation)
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError) {
      console.error("Register createUser error:", createError.message);
      if (createError.message.toLowerCase().includes("already registered") ||
          createError.message.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 400 });
      }
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    // Insert profile row (only columns that exist in schema)
    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      id: created.user.id,
      email,
      plan: "free",
    });

    if (profileError) {
      console.error("Register profile insert error:", profileError.message);
      // User created in auth but profile failed — try to clean up
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: "Account setup failed. Please try again." }, { status: 500 });
    }

    // Sign in with regular client to get session tokens
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: session, error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !session.session) {
      console.error("Register sign-in error:", signInError?.message);
      // User and profile created but auto sign-in failed — redirect to login
      return NextResponse.json({ success: true, redirectTo: "/login" });
    }

    const res = NextResponse.json({
      success: true,
      accessToken: session.session.access_token,
      refreshToken: session.session.refresh_token,
    });
    res.cookies.set("sb-access-token", session.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.set("sb-refresh-token", session.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return res;
  } catch (e) {
    console.error("Register exception:", e);
    return NextResponse.json({ error: "Registration failed. Please try again." }, { status: 500 });
  }
}
