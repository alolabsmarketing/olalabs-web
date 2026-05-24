import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { getCharacter } from "@/lib/characters";
import { getPlanLimits, canUseCharacter } from "@/lib/plan";
import type { DbProfile, DbDailyUsage, DbSession } from "@/lib/db-types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const MAX_TOKENS: Record<string, number> = {
  very_short: 80, short: 130, medium: 200, long: 300,
};

export async function POST(req: NextRequest) {
  const { characterId, scenario: rawScenario, messages, isInitial, sessionId } = await req.json();

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
  const userId = await getUserIdFromRequest(req);

  if (isInitial && userId) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single<Pick<DbProfile, "plan">>();
    const userPlan = profile?.plan ?? "free";
    const limits = getPlanLimits(userPlan);

    if (!canUseCharacter(userPlan, characterId)) {
      return new Response(JSON.stringify({ error: "CHARACTER_LOCKED" }), { status: 403 });
    }

    if (limits.sessionsPerDay !== Infinity) {
      const today = new Date().toISOString().split("T")[0];
      const { data: usage } = await supabaseAdmin.from("daily_usage").select("session_count").eq("user_id", userId).eq("date", today).single<Pick<DbDailyUsage, "session_count">>();
      const count = usage?.session_count ?? 0;
      if (count >= limits.sessionsPerDay) {
        return new Response(JSON.stringify({ error: "SESSION_LIMIT" }), { status: 403 });
      }
      await supabaseAdmin.from("daily_usage").upsert(
        { user_id: userId, date: today, session_count: count + 1 },
        { onConflict: "user_id,date" }
      );
    }
  }

  if (!isInitial && userId && sessionId) {
    const { data: profile } = await supabaseAdmin.from("profiles").select("plan").eq("id", userId).single<Pick<DbProfile, "plan">>();
    const limits = getPlanLimits(profile?.plan ?? "free");
    if (limits.sessionMinutes !== Infinity) {
      const { data: sessionRow } = await supabaseAdmin.from("sessions").select("started_at").eq("id", sessionId).eq("user_id", userId).single<Pick<DbSession, "started_at">>();
      if (sessionRow) {
        const elapsed = (Date.now() - new Date(sessionRow.started_at).getTime()) / 60000;
        if (elapsed >= limits.sessionMinutes) {
          return new Response(JSON.stringify({ error: "SESSION_LIMIT" }), { status: 403 });
        }
      }
    }
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
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const chunk = event.delta.text;
          fullText += chunk;
          controller.enqueue(new TextEncoder().encode(chunk));
        }
      }
      controller.close();

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
