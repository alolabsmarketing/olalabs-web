import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/claude";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { getCharacter } from "@/lib/characters";
import { canUseCharacter } from "@/lib/plan";
import type { DbProfile } from "@/lib/db-types";
import { getCustomCharacterById, buildCustomCharacterSystemPrompt } from "@/lib/custom-characters";

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
    const { characterId, customCharacterId, scenario: rawScenario, messages, isInitial, sessionId } = await req.json();

    // ── Custom character path ──────────────────────────────────────────────────
    if (customCharacterId) {
      const userId = await getUserIdFromRequest(req);
      if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

      const customChar = await getCustomCharacterById(customCharacterId, userId);
      if (!customChar) return NextResponse.json({ error: "Character not found" }, { status: 404 });

      const systemPrompt = buildCustomCharacterSystemPrompt(customChar);

      if (isInitial) {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 150,
          system: systemPrompt,
          messages: [{ role: "user", content: "Start the session naturally." }],
        });
        const content = response.content[0].type === "text" ? response.content[0].text : "";

        const { data: session } = await supabaseAdmin
          .from("sessions")
          .insert({ user_id: userId, character_id: "custom", custom_character_id: customCharacterId, scenario: null })
          .select("id")
          .single();

        const newSessionId = session?.id ?? null;
        if (newSessionId) {
          await supabaseAdmin.from("messages").insert({ session_id: newSessionId, role: "assistant", content });
        }

        return NextResponse.json({ content, sessionId: newSessionId });
      }

      let apiMessages = (messages as Array<{ role: string; content: string }>).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));
      if (apiMessages.length > 0 && apiMessages[0].role === "assistant") {
        apiMessages = [{ role: "user", content: "Begin the session." }, ...apiMessages];
      }

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        system: systemPrompt,
        messages: apiMessages,
      });
      const content = response.content[0].type === "text" ? response.content[0].text : "";

      if (userId && sessionId) {
        const lastUserMessage = (messages as Array<{ role: string; content: string }>)[messages.length - 1];
        await supabaseAdmin.from("messages").insert([
          { session_id: sessionId, role: "user", content: lastUserMessage.content },
          { session_id: sessionId, role: "assistant", content },
        ]);
      }

      return NextResponse.json({ content });
    }
    // ── Standard character path (existing code unchanged below) ───────────────

    const character = getCharacter(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found" }, { status: 404 });
    }

    // Sanitize user-supplied scenario to prevent prompt injection
    const scenario = rawScenario
      ? String(rawScenario).slice(0, 500).replace(/[\r\n]+/g, " ").trim()
      : null;

    const scenarioPart = scenario
      ? `\n\nSCENARIO: ${scenario}\n\nDrop into this scenario immediately — you're already in the scene when the conversation begins. Take whatever role fits naturally (interviewer, staff, colleague, or yourself in a real-world situation). Don't announce the scenario or explain it. Just start.`
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
          .single<Pick<DbProfile, "plan">>();

        const userPlan = profile?.plan ?? "free";

        if (!canUseCharacter(userPlan, characterId)) {
          return NextResponse.json({ error: "CHARACTER_LOCKED" }, { status: 403 });
        }
      }

      const initMessage = scenario
        ? `Start the conversation. You're in the scene. Go.`
        : "Start the conversation with a single natural sentence. Be direct. No greetings, no 'how can I help', no setup — just dive in as if mid-conversation.";

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
