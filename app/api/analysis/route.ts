import { NextRequest, NextResponse } from "next/server";
import { anthropic, ANALYSIS_PROMPT } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  try {
    const { messages } = await req.json();

    const conversationText = messages
      .map((m: { role: string; content: string }) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: ANALYSIS_PROMPT,
      messages: [
        {
          role: "user",
          content: `Analyze this conversation:\n\n${conversationText}`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
