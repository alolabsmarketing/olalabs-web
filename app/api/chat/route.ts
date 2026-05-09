import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { anthropic } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase";
import { getUserIdFromRequest } from "@/lib/auth-server";
import type { Character } from "@/lib/characters";

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

    const apiMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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
