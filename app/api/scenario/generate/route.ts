import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/claude";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic API key is missing." },
      { status: 500 }
    );
  }

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { scenario } = await req.json();

    if (!scenario || typeof scenario !== "string") {
      return NextResponse.json({ error: "Scenario is required." }, { status: 400 });
    }

    const sanitized = scenario.slice(0, 500).replace(/[\r\n]+/g, " ").trim();

    if (sanitized.length < 20) {
      return NextResponse.json(
        { error: "Scenario must be at least 20 characters." },
        { status: 400 }
      );
    }

    const prompt = `You are a character generator. Based on this scenario, create a realistic character who would be the OTHER person in this conversation.

Scenario: ${sanitized}

Respond with JSON only — no markdown, no extra text:
{
  "name": "character first name",
  "role": "their role/title in this scenario",
  "personality": "2-3 sentence personality description",
  "systemPrompt": "You are {name}, {role}. {personality} The user has described this scenario: ${sanitized}. Stay in character. Speak naturally and realistically. Keep responses concise (2-4 sentences). Do not break character."
}`;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let character: { name: string; role: string; personality: string; systemPrompt: string };
    try {
      // Strip potential markdown code fences
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      character = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not generate character. Please try again." },
        { status: 500 }
      );
    }

    if (!character.name || !character.role || !character.systemPrompt) {
      return NextResponse.json(
        { error: "Could not generate character. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ character });
  } catch (error) {
    console.error("[scenario/generate] error:", error);
    return NextResponse.json(
      { error: "Could not generate character. Please try again." },
      { status: 500 }
    );
  }
}
