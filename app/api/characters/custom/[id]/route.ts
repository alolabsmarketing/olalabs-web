import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterById } from "@/lib/custom-characters";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const existing = await getCustomCharacterById(id, userId);
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await req.json();
  const updates: Record<string, string | null> = {};

  if (body.name !== undefined) updates.name = String(body.name).trim().slice(0, 50);
  if (body.personality_prompt !== undefined)
    updates.personality_prompt = String(body.personality_prompt).trim().slice(0, 300);
  if (body.relationship_hint !== undefined)
    updates.relationship_hint = body.relationship_hint
      ? String(body.relationship_hint).trim().slice(0, 100)
      : null;
  if (body.voice_id !== undefined) updates.voice_id = body.voice_id ?? null;
  if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url ?? null;

  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const existing = await getCustomCharacterById(id, userId);
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("custom_characters")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  return NextResponse.json({ success: true });
}
