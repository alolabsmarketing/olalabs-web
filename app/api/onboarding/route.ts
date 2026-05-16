import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getUserIdFromRequest } from "@/lib/auth-server";

export async function PATCH(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { level, goal, language } = await req.json();

  if (!level || !goal) {
    return NextResponse.json({ error: "level and goal are required" }, { status: 400 });
  }

  const validLevels = ["beginner", "intermediate", "advanced"];
  const validGoals = ["travel", "work", "casual", "exam"];
  const validLanguages = ["en", "tr"];

  if (!validLevels.includes(level) || !validGoals.includes(goal)) {
    return NextResponse.json({ error: "Invalid level or goal value" }, { status: 400 });
  }

  const lang = validLanguages.includes(language) ? language : "en";

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ level, goal, language: lang })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set("lang", lang, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}
