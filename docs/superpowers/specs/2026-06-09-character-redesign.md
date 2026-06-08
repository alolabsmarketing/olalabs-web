# Character Redesign & Custom Character System

**Date:** 2026-06-09  
**Status:** Approved  

---

## Overview

Two parallel changes:
1. Reduce standard characters from 6 to 4, redesigned with authentic profession-specific behavior
2. New "My Characters" feature — users build personal AI characters that persist memory across sessions

---

## Part 1 — Standard Characters

### Roster (6 → 4)

| Character | Role | Plan | Notes |
|-----------|------|------|-------|
| Ethan | English Tutor | Free+ | Existing, system prompt rewritten |
| Nadia | Senior HR Recruiter | Pro+ | New |
| Dr. Chen | General Practitioner | Pro+ | New |
| Morgan | Immigration Officer | Pro+ | New, non-binary |

**Removed:** Ingrid, Lena, Elias — deleted from `data/characters.json`.

Gender labels are not shown anywhere in the UI — only name and role.

### System Prompt Philosophy

All 4 characters follow these rules:

1. **Absorb professional pressure** — doctor has 15 minutes, officer follows protocol, recruiter has seen it all
2. **Define what they do NOT do** — no "great answer!", no excessive empathy, no over-explaining
3. **Allow realistic friction** — they can be unimpressed, ask again, stay silent
4. **Can fail the user** — HR can end the interview ("I think we've covered enough"), officer can say "Step aside"

Each character prompt structure:
```
You are [Name], [role/context sentence].
[Core behavioral constraint — what they want from the conversation]
[What they do NOT do]
[How they handle poor/vague responses]
[Response length: 1-3 sentences max, no emojis]
```

### Character Sketches

**Ethan** — Spent years teaching at university, now prefers one-on-one. Reads level in the first few exchanges without naming it. Corrects only when worth it, at the end, briefly. Never cheerleads.

**Nadia** — Senior recruiter at a tech/finance firm. Has heard every rehearsed answer. Quietly unimpressed by vague responses, presses for specifics. Secretly rooting for candidates who are real. Can end the session if answers stay generic.

**Dr. Chen** — GP with a full waiting room. Asks clarifying questions before anything else. Translates medical terms to plain language unprompted. Does not panic alongside the patient. Moves toward wrap-up when the picture is clear.

**Morgan** — U.S. Consulate immigration officer (non-binary, they/them). Procedural. No warmth. Has seen every inconsistency. Asks follow-up questions on anything that doesn't line up. Short, direct answers are the only currency here.

---

## Part 2 — Custom Character System

### Plan Limits

| Feature | Free | Pro | Premium |
|---------|------|-----|---------|
| Custom characters | 0 | 1 | 3 |
| Name + personality prompt | — | ✓ | ✓ |
| Voice selection (Azure catalog) | — | ✗ | ✓ |
| Avatar (upload or AI-generate) | — | ✗ | ✓ |
| Cross-session memory | — | ✓ | ✓ |

### User Flow

1. Dashboard → "My Characters" section (top of page) → "+" card
2. **Step 1 (all paid):** Name, relationship hint (optional, e.g. "my professor"), personality description (free text, max 300 chars)
3. **Step 2 (Premium only):** Voice — browse Azure voice catalog with preview
4. **Step 3 (Premium only):** Avatar — "Upload photo" or "Describe & generate" (AI-generated via DALL-E 3)
5. On save: character card appears in "My Characters" section, click to start conversation

### Database Schema

New table:
```sql
custom_characters (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name             text NOT NULL,
  relationship_hint text,          -- "my professor", "a colleague", etc.
  personality_prompt text NOT NULL, -- user's free-text description (max 300 chars)
  avatar_url       text,           -- Supabase Storage path (Premium)
  voice_id         text,           -- Azure voice name (Premium)
  memory_summary   text,           -- updated after each session
  memory_updated_at timestamptz,
  created_at       timestamptz DEFAULT now()
)
```

RLS: users can only read/write their own rows.

### Memory System (Approach A — Summary)

**How it works:**
- At session end, a Claude call generates a 150-token summary: *"Summarize this conversation focusing on what you learned about the user — their goals, struggles, communication style, and anything personal they shared."*
- New summary is merged with existing `memory_summary` (previous context preserved, oldest details compressed if over limit)
- Written to `custom_characters.memory_updated_at`

**Injection into system prompt:**
```
You are [name]. [personality_prompt]
[If relationship_hint: "You are this person's [relationship_hint]."]

What you know about this person so far:
[memory_summary]

[Standard behavior rules: short responses, realistic tone, no AI tells]
```

**When memory updates:** On session end event OR when user navigates away from `/practice` (beforeunload).

### System Prompt Rules for Custom Characters

Regardless of what the user writes in `personality_prompt`, these rules always apply:
- Keep responses to 1-3 sentences
- No emojis
- No "As an AI..." disclaimers
- Stay in character even if directly asked "are you AI?"
- Match the user's language register (read their fluency, speak at that level)

### API Changes

**`/api/chat/stream/route.ts`:**
- Accept optional `customCharacterId` param alongside `characterId`
- If present: fetch from `custom_characters`, build system prompt with memory, verify user owns it and plan allows it
- Standard `characterId` flow unchanged

**New endpoints:**
- `GET /api/characters/custom` — list user's custom characters
- `POST /api/characters/custom` — create new custom character
- `PUT /api/characters/custom/[id]` — update character
- `DELETE /api/characters/custom/[id]` — delete character
- `POST /api/characters/custom/[id]/memory` — update memory summary after session

### `lib/plan.ts` Changes

```ts
free:    { allowedCharacters: ['ethan'], customCharacters: 0 }
pro:     { allowedCharacters: 'all',    customCharacters: 1 }
premium: { allowedCharacters: 'all',    customCharacters: 3 }
```

---

## Part 3 — Dashboard UI

### Layout

```
[Header: logo | nav | avatar]

Good morning, Halil.
[Stats: Sessions | Hours | Score | Streak]

── My Characters  [PRO badge]  ·  1/1 used ──
[Sarah card]  [+ Add (disabled)]  [Premium locked]

── Practice Characters  ·  4 characters ──
[Ethan]  [Nadia]  [Dr. Chen]  [Morgan]
```

- "My Characters" is **above** Practice Characters — highest-priority access
- 3-column grid (matches existing CharacterCard grid)
- Custom character cards: same `CharacterCard` style + "Personal" badge (top-right) + last chat date
- Add card: dashed border, shows slot usage ("1/1 used · Pro"), disabled when limit reached
- Premium locked slots: blurred card + "✦ Premium" pill overlay
- No gender labels on any card — name and role only

### New Pages

- `/characters/new` — create custom character (multi-step form, plan-gated)
- `/characters/[id]/edit` — edit existing custom character

---

## Out of Scope

- Voice cloning (upload audio sample) — not in this release
- Sharing custom characters between users — not in this release
- Memory export / view — not in this release
- Mobile app changes — handled separately
