import type { Plan } from "./plan";

export interface DbProfile {
  id: string;
  email: string;
  plan: Plan;
  native_language: string | null;
  practice_language: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
}

export interface DbDailyUsage {
  user_id: string;
  date: string;
  session_count: number;
  voice_seconds: number;
}

export interface DbSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
}

export interface AnalysisResult {
  grammar_score: number;
  vocabulary_score: number;
  fluency_score: number;
  overall_score: number;
  grammar_errors: Array<{ original: string; corrected: string; explanation: string }>;
  vocabulary_suggestions: Array<{ word: string; alternatives: string[]; context: string }>;
  tips: [string, string, string];
  summary: string;
}

export interface DbCustomCharacter {
  id: string;
  user_id: string;
  name: string;
  relationship_hint: string | null;
  personality_prompt: string;
  avatar_url: string | null;
  voice_id: string | null;
  memory_summary: string | null;
  memory_updated_at: string | null;
  created_at: string;
}
