import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { level, goal, native_language } = await req.json();
  await supabaseAdmin.from("profiles").update({ level, goal, native_language }).eq("id", userId);
  return NextResponse.json({ success: true });
}
