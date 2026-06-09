import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterById } from "@/lib/custom-characters";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const char = await getCustomCharacterById(id, userId);
  if (!char) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  // Fetch messages from this session
  const { data: messages } = await supabaseAdmin
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("id", { ascending: true });

  if (!messages || messages.length < 2) {
    return NextResponse.json({ success: true, skipped: true });
  }

  const transcript = (messages as Array<{ role: string; content: string }>)
    .map((m) => `${m.role === "user" ? "User" : char.name}: ${m.content}`)
    .join("\n");

  const previousContext = char.memory_summary
    ? `Previous context about this person:\n${char.memory_summary}\n\n`
    : "";

  const summaryPrompt = `${previousContext}New conversation:\n${transcript}\n\nWrite a concise summary (max 200 words) of what you now know about this person — their goals, communication style, struggles, and anything personal they shared. Merge new information with previous context. Write in second person addressed to ${char.name}.`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [{ role: "user", content: summaryPrompt }],
  });

  const newSummary =
    response.content[0].type === "text" ? response.content[0].text.trim() : null;

  if (!newSummary) return NextResponse.json({ success: true, skipped: true });

  await supabaseAdmin
    .from("custom_characters")
    .update({ memory_summary: newSummary, memory_updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  return NextResponse.json({ success: true });
}
