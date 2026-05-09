import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: sessions, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      analysis_results (
        grammar_score,
        vocabulary_score,
        fluency_score
      )
    `)
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  return NextResponse.json({ sessions });
}
