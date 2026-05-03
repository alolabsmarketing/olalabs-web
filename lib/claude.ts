import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const ANALYSIS_PROMPT = `You are an expert English language assessor. Review the following conversation between a user and an AI language tutor. Provide a structured analysis in JSON format.

Evaluate:
1. Grammar accuracy (score 0-100)
2. Vocabulary range (score 0-100)
3. Fluency/coherence (score 0-100)
4. Specific grammar mistakes found
5. Vocabulary suggestions (better word choices)
6. 3 actionable improvement tips

Return ONLY valid JSON in this exact structure:
{
  "grammar_score": number,
  "vocabulary_score": number,
  "fluency_score": number,
  "overall_score": number,
  "grammar_errors": [{"original": string, "corrected": string, "explanation": string}],
  "vocabulary_suggestions": [{"word": string, "alternatives": string[], "context": string}],
  "tips": [string, string, string],
  "summary": string
}`;
