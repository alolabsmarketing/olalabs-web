import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildAnalysisPrompt } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages, sessionId } = await req.json();

    const userId = await getUserIdFromRequest(req);

    // Fetch native + practice language for this user
    let nativeLang = "English";
    let practiceLang = "English";
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("native_language, practice_language")
        .eq("id", userId)
        .single();

      const langNames: Record<string, string> = {
        tr: "Turkish", ar: "Arabic", es: "Spanish", fr: "French",
        de: "German", it: "Italian", pt: "Portuguese", ru: "Russian",
        zh: "Chinese", ja: "Japanese", ko: "Korean", en: "English",
      };
      nativeLang  = langNames[profile?.native_language  ?? "en"] ?? "English";
      practiceLang = langNames[profile?.practice_language ?? "en"] ?? "English";
    }

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: buildAnalysisPrompt(nativeLang, practiceLang),
      messages: [{ role: "user", content: `Analyze this conversation:\n\n${conversationText}` }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    if (userId && sessionId) {
      await supabaseAdmin.from("analysis_results").insert({
        session_id: sessionId,
        grammar_score: analysis.grammar_score ?? null,
        vocabulary_score: analysis.vocabulary_score ?? null,
        fluency_score: analysis.fluency_score ?? null,
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
