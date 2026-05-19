import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

const PLAN_RANK: Record<string, number> = { free: 0, pro: 1, premium: 2 };

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  const token = cookieStore.get("sb-access-token")?.value;

  let plan = "free";
  let practiceLang = "en";

  if (token) {
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan, practice_language")
        .eq("id", user.id)
        .single();
      plan = (profile as { plan?: string } | null)?.plan ?? "free";
      practiceLang = (profile as { practice_language?: string } | null)?.practice_language ?? "en";
    }
  }

  const { data: scenarios, error } = await supabaseAdmin
    .from("scenarios")
    .select("slug, category, icon, title_en, title_tr, description_en, description_tr, min_plan, sort_order")
    .eq("practice_language", practiceLang)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const userRank = PLAN_RANK[plan] ?? 0;
  const result = (scenarios ?? []).map((s: { min_plan: string; [key: string]: unknown }) => ({
    ...s,
    locked: (PLAN_RANK[s.min_plan] ?? 0) > userRank,
  }));

  return NextResponse.json({ scenarios: result });
}
