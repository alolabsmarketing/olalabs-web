import { NextRequest, NextResponse } from "next/server";
import { anthropic, buildAnalysisPrompt } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import type { AnalysisResult } from "@/lib/db-types";

const ANALYSIS_TOOL = {
  name: "submit_analysis",
  description: "Submit the structured language analysis result",
  input_schema: {
    type: "object" as const,
    properties: {
      grammar_score:       { type: "number", description: "Grammar accuracy 0-100" },
      vocabulary_score:    { type: "number", description: "Vocabulary range 0-100" },
      fluency_score:       { type: "number", description: "Fluency/coherence 0-100" },
      overall_score:       { type: "number", description: "Overall score 0-100" },
      grammar_errors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            original:    { type: "string" },
            corrected:   { type: "string" },
            explanation: { type: "string" },
          },
          required: ["original", "corrected", "explanation"],
        },
      },
      vocabulary_suggestions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            word:         { type: "string" },
            alternatives: { type: "array", items: { type: "string" } },
            context:      { type: "string" },
          },
          required: ["word", "alternatives", "context"],
        },
      },
      tips:    { type: "array", items: { type: "string" } },
      summary: { type: "string" },
    },
    required: [
      "grammar_score", "vocabulary_score", "fluency_score", "overall_score",
      "grammar_errors", "vocabulary_suggestions", "tips", "summary",
    ] as string[],
  },
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages, sessionId } = await req.json();

    const userId = await getUserIdFromRequest(req);

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
      nativeLang   = langNames[profile?.native_language  ?? "en"] ?? "English";
      practiceLang = langNames[profile?.practice_language ?? "en"] ?? "English";
    }

    const conversationText = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`
      )
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: buildAnalysisPrompt(nativeLang, practiceLang),
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: "tool", name: "submit_analysis" },
      messages: [{ role: "user", content: `Analyze this conversation:\n\n${conversationText}` }],
    });

    const toolUse = response.content.find((c) => c.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json({ error: "Analysis unavailable" }, { status: 500 });
    }

    const analysis = toolUse.input as AnalysisResult;

    if (userId && sessionId) {
      await supabaseAdmin.from("analysis_results").insert({
        session_id:       sessionId,
        grammar_score:    analysis.grammar_score    ?? null,
        vocabulary_score: analysis.vocabulary_score ?? null,
        fluency_score:    analysis.fluency_score    ?? null,
        feedback:         analysis,
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
