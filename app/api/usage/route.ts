import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import type { DbDailyUsage } from "@/lib/db-types";

const SESSION_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
  premium: Infinity,
};

const VOICE_LIMITS: Record<string, number> = {
  free: 5 * 60,    // 300 seconds
  pro: Infinity,
  premium: Infinity,
};

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single<{ plan: string }>();

  const plan = profile?.plan ?? "free";
  const today = new Date().toISOString().split("T")[0];

  const { data: usage } = await supabaseAdmin
    .from("daily_usage")
    .select("session_count, voice_seconds")
    .eq("user_id", userId)
    .eq("date", today)
    .single<Pick<DbDailyUsage, "session_count" | "voice_seconds">>();

  return NextResponse.json({
    plan,
    sessionsToday: usage?.session_count ?? 0,
    sessionLimit: SESSION_LIMITS[plan] ?? 3,
    voiceSecondsToday: usage?.voice_seconds ?? 0,
    voiceLimit: VOICE_LIMITS[plan] ?? 300,
  });
}
