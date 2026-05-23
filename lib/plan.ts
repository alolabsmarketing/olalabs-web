export type Plan = 'free' | 'pro' | 'premium'

export interface PlanLimits {
  sessionsPerDay: number        // Infinity = unlimited
  sessionMinutes: number        // Infinity = unlimited
  voiceMinutesPerDay: number    // Infinity = unlimited
  allowedCharacters: string[] | 'all'
  hasAnalysis: boolean
  hasProgressCharts: boolean
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    sessionsPerDay: 3,
    sessionMinutes: 5,
    voiceMinutesPerDay: 10,
    allowedCharacters: ['ethan', 'noah'],
    hasAnalysis: false,
    hasProgressCharts: false,
  },
  pro: {
    sessionsPerDay: 10,
    sessionMinutes: 20,
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    hasAnalysis: true,
    hasProgressCharts: false,
  },
  premium: {
    sessionsPerDay: Infinity,
    sessionMinutes: Infinity,
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    hasAnalysis: true,
    hasProgressCharts: true,
  },
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan === 'pro') return PLAN_LIMITS.pro
  if (plan === 'premium') return PLAN_LIMITS.premium
  return PLAN_LIMITS.free
}

export function canUseCharacter(plan: string | null | undefined, characterId: string): boolean {
  const limits = getPlanLimits(plan)
  if (limits.allowedCharacters === 'all') return true
  return limits.allowedCharacters.includes(characterId)
}

// Estimates TTS audio duration from text: ~150 wpm = 2.5 words/sec
export function estimateVoiceSeconds(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 2.5)
}
