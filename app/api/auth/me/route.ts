import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ loggedIn: false });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ loggedIn: false });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, native_language, practice_language")
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    loggedIn: true,
    plan: profile?.plan ?? "free",
    nativeLanguage: profile?.native_language ?? "tr",
    practiceLanguage: profile?.practice_language ?? "en",
  });
}
