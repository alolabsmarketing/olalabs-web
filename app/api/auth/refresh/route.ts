import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function makeClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// GET — called by middleware when access token is expired but refresh token cookie exists
export async function GET(req: NextRequest) {
  const redirectTo = req.nextUrl.searchParams.get("redirect") ?? "/dashboard";
  const refreshToken = req.cookies.get("sb-refresh-token")?.value;

  if (!refreshToken) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { data, error } = await makeClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", redirectTo);
      return NextResponse.redirect(loginUrl);
    }

    const res = NextResponse.redirect(new URL(redirectTo, req.url));
    res.cookies.set("sb-access-token", data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    res.cookies.set("sb-refresh-token", data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return res;
  } catch {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(loginUrl);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json();
    if (!refreshToken) {
      return NextResponse.json({ error: "Missing refreshToken" }, { status: 400 });
    }

    const { data, error } = await makeClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      return NextResponse.json({ error: "Refresh failed" }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (e) {
    console.error("Refresh token error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
