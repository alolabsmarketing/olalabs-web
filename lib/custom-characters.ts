import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCustomCharacterLimit } from "@/lib/plan";
import type { DbCustomCharacter } from "@/lib/db-types";

export type { DbCustomCharacter };

export function buildCustomCharacterSystemPrompt(char: DbCustomCharacter): string {
  const relationshipLine = char.relationship_hint
    ? `You are this person's ${char.relationship_hint}.`
    : "";

  const memoryLine = char.memory_summary
    ? `\n\nWhat you know about this person so far:\n${char.memory_summary}`
    : "";

  return [
    `You are ${char.name}. ${char.personality_prompt}`,
    relationshipLine,
    memoryLine,
    "\nKeep responses to 1-3 sentences. No emojis. No \"As an AI\" disclaimers. Stay in character. Match the person's language register.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function getUserCustomCharacters(userId: string): Promise<DbCustomCharacter[]> {
  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbCustomCharacter[];
}

export async function getCustomCharacterById(
  id: string,
  userId: string
): Promise<DbCustomCharacter | null> {
  const { data, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data as DbCustomCharacter;
}

export async function canUserCreateCustomCharacter(
  userId: string,
  plan: string | null | undefined
): Promise<boolean> {
  const limit = getCustomCharacterLimit(plan);
  if (limit === 0) return false;

  const { count, error } = await supabaseAdmin
    .from("custom_characters")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) return false;
  return (count ?? 0) < limit;
}
