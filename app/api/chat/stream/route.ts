import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { getCharacter } from "@/lib/characters";
import { canUseCharacter } from "@/lib/plan";
import type { DbProfile } from "@/lib/db-types";
import { getCustomCharacterById, buildCustomCharacterSystemPrompt } from "@/lib/custom-characters";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MAX_TOKENS: Record<string, number> = {
  very_short: 80, short: 130, medium: 200, long: 300,
};

export async function POST(req: NextRequest) {
  const { characterId, customCharacterId, scenario: rawScenario, messages, isInitial, sessionId } = await req.json();

  // ── Auth setup (needed by both paths) ─────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  const hasBearerToken = authHeader?.startsWith("Bearer ");
  const userId = await getUserIdFromRequest(req);
  if (hasBearerToken && !userId) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }

  const effectivePlan = userId
    ? await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single<Pick<DbProfile, "plan">>().then(r => r.data?.plan ?? "free")
    : "free";

  // ── Custom character path ──────────────────────────────────────────────────
  if (customCharacterId) {
    if (!userId) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
    }

    const customChar = await getCustomCharacterById(customCharacterId, userId);
    if (!customChar) {
      return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
    }

    const systemPrompt = buildCustomCharacterSystemPrompt(customChar);

    let apiMessages = isInitial
      ? [{ role: "user" as const, content: "Start the session naturally." }]
      : (messages as Array<{ role: string; content: string }>).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

    if (!isInitial && apiMessages.length > 0 && apiMessages[0].role === "assistant") {
      apiMessages = [{ role: "user" as const, content: "Begin the session." }, ...apiMessages];
    }

    let newSessionId: string | null = sessionId ?? null;
    if (isInitial) {
      const { data: session } = await supabaseAdmin
        .from("sessions")
        .insert({ user_id: userId, character_id: "custom", custom_character_id: customCharacterId, scenario: null })
        .select("id")
        .single();
      if (session) newSessionId = (session as { id: string }).id;
    }

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 150,
      system: systemPrompt,
      messages: apiMessages,
    });

    const sessionIdHeader = newSessionId ?? "";

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const event of stream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const chunk = event.delta.text;
              fullText += chunk;
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          }
          if (userId && newSessionId) {
            if (isInitial) {
              await supabaseAdmin.from("messages").insert({ session_id: newSessionId, role: "assistant", content: fullText });
            } else {
              const lastUser = (messages as Array<{ role: string; content: string }>)[messages.length - 1];
              await supabaseAdmin.from("messages").insert([
                { session_id: newSessionId, role: "user", content: lastUser.content },
                { session_id: newSessionId, role: "assistant", content: fullText },
              ]);
            }
          }
        } catch (err) {
          console.error("Stream error:", err);
          controller.error(err);
          return;
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": sessionIdHeader,
        "Cache-Control": "no-store",
      },
    });
  }

  // ── Standard character path ────────────────────────────────────────────────
  const character = getCharacter(characterId);
  if (!character) {
    return new Response(JSON.stringify({ error: "Character not found" }), { status: 404 });
  }

  const scenario = rawScenario
    ? String(rawScenario).slice(0, 500).replace(/[\r\n]+/g, " ").trim()
    : null;

  const scenarioPart = scenario
    ? `\n\nSCENARIO: ${scenario}\n\nDrop into this scenario immediately — you're already in the scene. Take the role naturally. Don't announce it. Just start.`
    : "";

  const systemPrompt = character.systemPrompt + scenarioPart;
  const maxTokens = MAX_TOKENS[character.style.responseLength] ?? 150;

  if (!canUseCharacter(effectivePlan, characterId)) {
    return new Response(JSON.stringify({ error: "CHARACTER_LOCKED" }), { status: 403 });
  }

  let apiMessages = isInitial
    ? [{ role: "user" as const, content: scenario ? "Start. You're in the scene. Go." : "Start the session naturally." }]
    : (messages as Array<{ role: string; content: string }>).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (!isInitial && apiMessages.length > 0 && apiMessages[0].role === "assistant") {
    apiMessages = [{ role: "user" as const, content: "Begin the session." }, ...apiMessages];
  }

  let newSessionId: string | null = sessionId ?? null;
  if (isInitial && userId) {
    const { data: session } = await supabaseAdmin.from("sessions")
      .insert({ user_id: userId, character_id: characterId, scenario: scenario ?? null })
      .select("id").single();
    if (session) newSessionId = (session as { id: string }).id;
  }

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: apiMessages,
  });

  const sessionIdHeader = newSessionId ?? "";

  const readable = new ReadableStream({
    async start(controller) {
      let fullText = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            const chunk = event.delta.text;
            fullText += chunk;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }
        // DB writes only on successful stream completion
        if (userId && newSessionId) {
          if (isInitial) {
            await supabaseAdmin.from("messages").insert({ session_id: newSessionId, role: "assistant", content: fullText });
          } else {
            const lastUser = (messages as Array<{ role: string; content: string }>)[messages.length - 1];
            await supabaseAdmin.from("messages").insert([
              { session_id: newSessionId, role: "user", content: lastUser.content },
              { session_id: newSessionId, role: "assistant", content: fullText },
            ]);
          }
        }
      } catch (err) {
        console.error("Stream error:", err);
        controller.error(err);
        return;
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Session-Id": sessionIdHeader,
      "Cache-Control": "no-store",
    },
  });
}
