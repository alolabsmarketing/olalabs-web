import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getPlanLimits, estimateVoiceSeconds } from "@/lib/plan";
import { getCharacter, type CharacterTTS } from "@/lib/characters";
import type { DbProfile, DbDailyUsage } from "@/lib/db-types";

const MAX_TTS_CHARS = 1000;

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

// Convert multiplier (0.88) to percentage string ("-12%")
function toPercent(value: number): string {
  const pct = Math.round((value - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

function buildSsml(
  text: string,
  voiceName: string,
  style?: string,
  styleDegree?: number,
  rate?: number,
  pitch?: number
): string {
  const rateStr = rate !== undefined && rate !== 1.0 ? ` rate="${toPercent(rate)}"` : "";
  const pitchStr = pitch !== undefined && pitch !== 1.0 ? ` pitch="${toPercent(pitch)}"` : "";
  const hasProsody = rateStr || pitchStr;

  const inner = hasProsody ? `<prosody${rateStr}${pitchStr}>${text}</prosody>` : text;

  const styled = style
    ? `<mstts:express-as style="${style}" styledegree="${styleDegree ?? 1.0}">${inner}</mstts:express-as>`
    : inner;

  return [
    `<speak version='1.0'`,
    ` xmlns='http://www.w3.org/2001/10/synthesis'`,
    ` xmlns:mstts='http://www.w3.org/2001/mstts'`,
    ` xml:lang='en-US'>`,
    `<voice name='${voiceName}'>${styled}</voice>`,
    `</speak>`,
  ].join("");
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
    if (text.length > MAX_TTS_CHARS) {
      return NextResponse.json({ error: "Text too long" }, { status: 400 });
    }

    const userId = await getUserIdFromRequest(req);
    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan")
        .eq("id", userId)
        .single<Pick<DbProfile, "plan">>();
      const userPlan = profile?.plan ?? "free";
      const limits = getPlanLimits(userPlan);

      if (limits.voiceMinutesPerDay !== Infinity) {
        const maxSeconds = limits.voiceMinutesPerDay * 60;
        const today = new Date().toISOString().split("T")[0];
        const { data: usage } = await supabaseAdmin
          .from("daily_usage")
          .select("voice_seconds")
          .eq("user_id", userId)
          .eq("date", today)
          .single<Pick<DbDailyUsage, "voice_seconds">>();

        const used = usage?.voice_seconds ?? 0;
        if (used >= maxSeconds) {
          return NextResponse.json({ error: "VOICE_LIMIT" }, { status: 403 });
        }

        const estimated = estimateVoiceSeconds(text);
        await supabaseAdmin.from("daily_usage").upsert(
          { user_id: userId, date: today, voice_seconds: Math.min(used + estimated, maxSeconds) },
          { onConflict: "user_id,date" }
        );
      }
    }

    const cleaned = cleanText(text);
    if (!cleaned) return NextResponse.json({ error: "No speakable text" }, { status: 400 });

    const character = getCharacter(characterId);
    const tts: Partial<CharacterTTS> = character?.tts ?? {};
    const voiceName = tts.azureVoiceName ?? "en-US-JennyNeural";

    const ssml = buildSsml(
      cleaned,
      voiceName,
      tts.azureStyle,
      tts.azureStyleDegree,
      tts.rate,
      tts.pitch
    );

    const response = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-48khz-192kbitrate-mono-mp3",
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
