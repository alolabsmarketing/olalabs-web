import { NextRequest, NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/auth-server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { level, goal, native_language } = await req.json();

  const VALID_LEVELS = ["beginner", "elementary", "intermediate", "upper-intermediate", "advanced"];
  const VALID_GOALS = ["job interviews", "daily conversation", "business english", "travel", "academic"];

  const safeLevel = VALID_LEVELS.includes(level) ? level : null;
  const safeGoal = VALID_GOALS.includes(goal) ? goal : (typeof goal === "string" && goal.length <= 100 ? goal : null);
  const safeLang = typeof native_language === "string" && native_language.length <= 50 ? native_language : null;

  await supabaseAdmin.from("profiles").update({
    level: safeLevel,
    goal: safeGoal,
    native_language: safeLang,
  }).eq("id", userId);
  return NextResponse.json({ success: true });
}
