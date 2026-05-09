import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get("sb-access-token")?.value;
  if (!token) return null;

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;

  return user.id;
}
