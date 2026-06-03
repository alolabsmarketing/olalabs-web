import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { native_language, practice_language, level, goal } = body;

  const update: Record<string, string> = {};
  if (user.email) update.email = user.email;
  if (native_language)  update.native_language  = native_language;
  if (practice_language) update.practice_language = practice_language;
  if (level) update.level = level;
  if (goal)  update.goal  = goal;

  const { error } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: user.id, ...update }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
