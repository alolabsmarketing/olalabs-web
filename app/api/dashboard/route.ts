import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";

function calculateStreak(dates: Array<{ date: string }>): number {
  if (!dates?.length) return 0;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dates[0].date !== today && dates[0].date !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1].date);
    const curr = new Date(dates[i].date);
    if (Math.round((prev.getTime() - curr.getTime()) / 86400000) === 1) streak++;
    else break;
  }
  return streak;
}

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: profile }, { data: recentSessions }, { data: usageDates }] = await Promise.all([
    supabaseAdmin.from("profiles").select("email, display_name, plan, sessions_count, level, goal, language").eq("id", userId).single(),
    supabaseAdmin.from("sessions")
      .select("started_at, ended_at, character_id, analysis_results(grammar_score, vocabulary_score, fluency_score)")
      .eq("user_id", userId).order("started_at", { ascending: false }).limit(20),
    supabaseAdmin.from("daily_usage").select("date").eq("user_id", userId)
      .order("date", { ascending: false }).limit(60),
  ]);

  const streak = calculateStreak(usageDates ?? []);

  type AnalysisRow = { grammar_score: number | null; vocabulary_score: number | null; fluency_score: number | null };
  type SessionRow = { started_at: string; ended_at: string | null; character_id: string | null; analysis_results: AnalysisRow[] };

  const sessions = (recentSessions ?? []) as SessionRow[];

  const scores = sessions
    .flatMap((s) => s.analysis_results ?? [])
    .map((a) => ((a.grammar_score ?? 0) + (a.vocabulary_score ?? 0) + (a.fluency_score ?? 0)) / 3)
    .filter((s) => s > 0);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  const totalMinutes = sessions
    .filter((s) => s.ended_at)
    .reduce((acc, s) => {
      const mins = Math.round((new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000);
      return acc + Math.max(0, mins);
    }, 0);

  const charStats: Record<string, { sessions: number; minutes: number }> = {};
  for (const s of sessions) {
    const cid = s.character_id ?? "unknown";
    if (!charStats[cid]) charStats[cid] = { sessions: 0, minutes: 0 };
    charStats[cid].sessions += 1;
    if (s.ended_at) {
      const mins = Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000);
      charStats[cid].minutes += Math.max(0, mins);
    }
  }

  type ProfileRow = { email?: string; display_name?: string | null; plan?: string; sessions_count?: number; level?: string | null; goal?: string | null };
  const p = profile as ProfileRow | null;

  return NextResponse.json({
    email: p?.email ?? "",
    displayName: p?.display_name ?? null,
    plan: p?.plan ?? "free",
    sessionsCount: p?.sessions_count ?? 0,
    totalMinutes,
    avgScore,
    level: p?.level ?? null,
    goal: p?.goal ?? null,
    streak,
    charStats,
  });
}
