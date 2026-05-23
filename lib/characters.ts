import charactersData from "@/data/characters.json";

export type ResponseLength = "very_short" | "short" | "medium" | "long";
export type Formality = "casual" | "semi_formal" | "formal";
export type CorrectionStyle = "inline" | "end_of_message" | "never";

export interface CharacterStyle {
  responseLength: ResponseLength;
  formality: Formality;
  correctsMistakes: boolean;
  correctionStyle: CorrectionStyle;
  correctionFormat: string;
  usesSlang: boolean;
  asksFollowups: boolean;
  encourages: boolean;
  maxSentences: number;
}

export interface CharacterTTS {
  rate: number;
  pitch: number;
  lang: string;
  elevenLabsVoiceId?: string;
  stability?: number;
}

export interface Character {
  id: string;
  name: string;
  role: string;
  profession: string;
  color: string;
  featured?: boolean;
  photo?: string;
  avatarInitials: string;
  description: string;
  personality: string;
  style: CharacterStyle;
  tts: CharacterTTS;
  systemPrompt: string;
}

export const CHARACTERS: Character[] = charactersData as Character[];

export function getCharacter(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
