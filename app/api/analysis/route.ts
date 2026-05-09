import { NextRequest, NextResponse } from "next/server";
import { anthropic, ANALYSIS_PROMPT } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages, sessionId } = await req.json();

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: ANALYSIS_PROMPT,
      messages: [{ role: "user", content: `Analyze this conversation:\n\n${conversationText}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const userId = await getUserIdFromRequest(req);
    if (userId && sessionId) {
      await supabaseAdmin.from("analysis_results").insert({
        session_id: sessionId,
        grammar_score: analysis.grammar ?? null,
        vocabulary_score: analysis.vocabulary ?? null,
        fluency_score: analysis.fluency ?? null,
        feedback: analysis,
      });

      await supabaseAdmin
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
