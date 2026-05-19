import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { anthropic } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import type { Character } from "@/lib/characters";
import { getPlanLimits, canUseCharacter } from "@/lib/plan";

function loadCharacter(id: string): Character | undefined {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "data", "characters.json"), "utf-8"));
    return data.find((c: Character) => c.id === id);
  } catch {
    return undefined;
  }
}

const MAX_TOKENS: Record<string, number> = {
  very_short: 80,
  short: 130,
  medium: 200,
  long: 300,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API key is missing. Please set ANTHROPIC_API_KEY in .env.local" },
      { status: 500 }
    );
  }

  try {
    const { characterId, scenario, messages, isInitial, sessionId } = await req.json();

    const character = loadCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    const scenarioPart = scenario
      ? `\n\nSCENARIO SET BY USER: "${scenario}"\nAdapt naturally to this scenario while keeping your character identity.`
      : "";

    const systemPrompt = character.systemPrompt + scenarioPart;
    const maxTokens = MAX_TOKENS[character.style.responseLength] ?? 150;

    const userId = await getUserIdFromRequest(req);

    if (isInitial) {
      if (userId) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .single();

        const userPlan = (profile as { plan?: string } | null)?.plan ?? "free";
        const limits = getPlanLimits(userPlan);

        if (limits.sessionsPerDay !== Infinity) {
          const today = new Date().toISOString().split("T")[0];
          const { data: usage } = await supabaseAdmin
            .from("daily_usage")
            .select("session_count")
            .eq("user_id", userId)
            .eq("date", today)
            .single();

          const count = (usage as { session_count?: number } | null)?.session_count ?? 0;
          if (count >= limits.sessionsPerDay) {
            return NextResponse.json({ error: "SESSION_LIMIT" }, { status: 403 });
          }

          await supabaseAdmin.from("daily_usage").upsert(
            { user_id: userId, date: today, session_count: count + 1 },
            { onConflict: "user_id,date" }
          );
        }

        if (!canUseCharacter(userPlan, characterId)) {
          return NextResponse.json({ error: "CHARACTER_LOCKED" }, { status: 403 });
        }
      }

      const initMessage = scenario
        ? `The user wants to practice English. Start the session in character. The scenario is: "${scenario}". Open the conversation naturally as your character would in this situation.`
        : "The user wants to practice English. Start the session with a natural opening that reflects your character. Don't say 'How can I help you?' — open in a way that's true to who you are.";

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: initMessage }],
      });

      const content = response.content[0].type === "text" ? response.content[0].text : "";

      let newSessionId: string | null = null;
      if (userId) {
        const { data: session } = await supabaseAdmin
          .from("sessions")
          .insert({ user_id: userId, character_id: characterId, scenario: scenario ?? null })
          .select("id")
          .single();

        if (session) {
          newSessionId = session.id;
          await supabaseAdmin.from("messages").insert({
            session_id: session.id,
            role: "assistant",
            content,
          });
        }
      }

      return NextResponse.json({ content, sessionId: newSessionId });
    }

    let apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    if (apiMessages.length > 0 && apiMessages[0].role === "assistant") {
      apiMessages = [{ role: "user", content: "Begin the session." }, ...apiMessages];
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    });

    const content = response.content[0].type === "text" ? response.content[0].text : "";

    if (userId && sessionId) {
      const lastUserMessage = messages[messages.length - 1];
      await supabaseAdmin.from("messages").insert([
        { session_id: sessionId, role: "user", content: lastUserMessage.content },
        { session_id: sessionId, role: "assistant", content },
      ]);
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
