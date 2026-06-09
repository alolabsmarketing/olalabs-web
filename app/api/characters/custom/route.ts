import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserCustomCharacters, canUserCreateCustomCharacter } from "@/lib/custom-characters";
import type { DbProfile } from "@/lib/db-types";

export async function GET(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const characters = await getUserCustomCharacters(userId);
    return NextResponse.json(characters);
  } catch {
    return NextResponse.json({ error: "Failed to load characters" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .single<Pick<DbProfile, "plan">>();

  const plan = profile?.plan ?? "free";

  const canCreate = await canUserCreateCustomCharacter(userId, plan);
  if (!canCreate) {
    return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
  }

  const body = await req.json();
  const name = String(body.name ?? "").trim().slice(0, 50);
  const personality_prompt = String(body.personality_prompt ?? "").trim().slice(0, 300);
  const relationship_hint = body.relationship_hint
    ? String(body.relationship_hint).trim().slice(0, 100)
    : null;

  if (!name || personality_prompt.length < 10) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .insert({ user_id: userId, name, personality_prompt, relationship_hint })
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to create character" }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
