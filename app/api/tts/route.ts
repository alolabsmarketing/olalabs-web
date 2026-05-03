import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

interface CharacterConfig {
  id: string;
  tts: { azureVoiceName?: string };
}

function loadCharacter(id: string): CharacterConfig | undefined {
  try {
    const data = JSON.parse(readFileSync(join(process.cwd(), "data", "characters.json"), "utf-8"));
    return data.find((c: CharacterConfig) => c.id === id);
  } catch {
    return undefined;
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/[☀-➿]/gu, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/→/g, "becomes")
    .replace(/\s*—\s*/g, ", ")
    .replace(/★/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const azureKey = process.env.AZURE_SPEECH_KEY;
  const azureRegion = process.env.AZURE_SPEECH_REGION ?? "eastus";

  if (!azureKey) {
    return NextResponse.json({ error: "Azure Speech key not configured" }, { status: 500 });
  }

  try {
    const { text, characterId } = await req.json();
    if (!text?.trim()) return NextResponse.json({ error: "No text provided" }, { status: 400 });

    const cleaned = cleanText(text);
    if (!cleaned) return NextResponse.json({ error: "No speakable text" }, { status: 400 });

    const character = loadCharacter(characterId);
    const voiceName = character?.tts?.azureVoiceName ?? "en-US-JennyNeural";

    const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${voiceName}'>${cleaned}</voice></speak>`;

    const response = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        },
        body: ssml,
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error(`Azure TTS error [${response.status}] region=${azureRegion} voice=${voiceName}:`, err);
      return NextResponse.json({ error: "TTS failed", detail: err }, { status: 502 });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("TTS route error:", e);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
