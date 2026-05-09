import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: session, error } = await supabaseAdmin
    .from("sessions")
    .select(`
      id,
      character_id,
      scenario,
      message_count,
      started_at,
      ended_at,
      messages (role, content, created_at),
      analysis_results (grammar_score, vocabulary_score, fluency_score, feedback)
    `)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ session });
}
