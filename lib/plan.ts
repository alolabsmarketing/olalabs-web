export type Plan = 'free' | 'pro' | 'premium'

export interface PlanLimits {
  voiceMinutesPerDay: number
  allowedCharacters: string[] | 'all'
  customCharacters: number
  hasAnalysis: boolean
  hasProgressCharts: boolean
  scenarioDuration: number // in seconds
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    voiceMinutesPerDay: 5,
    allowedCharacters: ['ethan'],
    customCharacters: 0,
    hasAnalysis: false,
    hasProgressCharts: false,
    scenarioDuration: 120,
  },
  pro: {
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    customCharacters: 1,
    hasAnalysis: true,
    hasProgressCharts: false,
    scenarioDuration: 900,
  },
  premium: {
    voiceMinutesPerDay: Infinity,
    allowedCharacters: 'all',
    customCharacters: 3,
    hasAnalysis: true,
    hasProgressCharts: true,
    scenarioDuration: Infinity,
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

export function getCustomCharacterLimit(plan: string | null | undefined): number {
  return getPlanLimits(plan).customCharacters
}

export function estimateVoiceSeconds(text: string): number {
  return Math.ceil(text.split(/\s+/).filter(Boolean).length / 2.5)
}
