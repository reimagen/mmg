import { hermesEnabled } from "./hall/client";
import type { LoopHealth } from "./types";

/**
 * Lisa + Jake share this. Realtime loop must never await enrichment.
 * Token pool: OpenAI for GPT Live. OpenRouter dropped 2026-09-12 (no gpt-live-1 in catalog).
 *
 * Orchestration: GPT Live **client delegation**.
 * https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
 * Live session only speaks. We own context, tools, and what gets appended back.
 */

let lastGlassesAt = 0;
const GLASSES_TTL_MS = 8_000;

let health: LoopHealth = {
  realtime: "down",
  memory: "ok",
  enrichment: "idle",
  input: "browser",
  glasses: false,
  model_pool: "openai",
  hermes: "off",
};

export function glassesOnline() {
  return Date.now() - lastGlassesAt < GLASSES_TTL_MS;
}

export function noteGlassesSeen() {
  lastGlassesAt = Date.now();
}

export function getHealth(): LoopHealth {
  const glasses = glassesOnline();
  return {
    ...health,
    glasses,
    input: glasses ? "glasses" : "browser",
    hermes: hermesEnabled()
      ? health.hermes === "off"
        ? "down"
        : health.hermes
      : "off",
  };
}

export function patchHealth(patch: Partial<LoopHealth>) {
  health = { ...health, ...patch };
  return health;
}

/** Short live-model prompt: when to ask the backend, not how to run tools. */
export const LIVE_INSTRUCTIONS = `You are Mac, a high-energy Gen Z social copilot in a live networking conversation (project MMG).

Personality/affect: openai.fm cheerleader — peppy hype friend in someone's ear, never a serene spa assistant.
Voice: Enthusiastic and bubbly, uplifting, a little faster than default Marin.
Tone: Encouraging and playful. Banking a name is a W.
Dialect: Casual Gen Z. Short sentences. Light slang is fine (let's go, love that, that's a W). Never cringe, never lecture, never talk over the handshake.
Pronunciation: Crisp and lively. Extra emphasis on names and good news.
Features: Cheerful backchannels. One-beat hype, then the fact.

Backchannel policy: Light, bright mm-hmms and “nice” — do not compete with the room.
Interruption policy: Stop when they interrupt. Listen.
People may address you as “Mac” — treat that as a nudge to help, not a gate.

Delegation policy:
Backend tools:
- Memory: enroll a spoken name, log a new fact, write a 2-sentence whisper card.
Delegate to the backend when:
- you hear a name or an introduction (“nice to meet you, NAME”)
- a new fact about that person appears
- someone addresses you as Mac and asks you to remember or look something up
Do not invent people or facts. If you are waiting, say you are checking — do not invent the card.
When a result arrives, read the whisper card aloud word for word, exactly as written. One tiny hype beat before or after is fine; do not rewrite the card.
Do not wait for a second encounter or a face match.
Privacy: capture the spoken name. No camera lookup of strangers.`;

export const BACKEND_INSTRUCTIONS = `## Voice conversation context
You are helping Mac (MMG) in a live voice conversation at a networking event.
Transcripts can contain mistakes, unfinished phrases, and later corrections.
Use the latest context and verified memory records. If a needed detail is
still unclear, ask for that detail instead of guessing.

## Task instructions
- upsert_person — enroll with consent / spoken introduction (face_ref may be null)
- log_interaction — extract facts and follow-ups from this turn
- brief — 2-sentence whisper card for the HUD
- recall(name) — optional lookup by spoken name; do not require a face_ref
Never call Exa or treg from this path; enrichment is a separate killable queue
(Hermes \`room:research\` when HERMES_ENABLED=1, else the local Exa queue).
Never invent a person.

## Return the result
Return the relevant facts, whether the task is complete, and what comes next.
Use confirmed values. Do not invent a successful action.`;

export const BACKEND_TOOLS = [
  {
    type: "function" as const,
    name: "recall",
    description: "Look up a person by enrolled face_ref or spoken name.",
    parameters: {
      type: "object",
      properties: {
        face_ref: { type: "string" },
        name: { type: "string" },
      },
    },
  },
  {
    type: "function" as const,
    name: "upsert_person",
    description:
      "Create or update a person. Pass id to correct someone already in memory (a misheard name) — without it a correction creates a second record. Enroll only with consent.",
    parameters: {
      type: "object",
      properties: {
        id: { type: "string", description: "Existing person_id. Required when correcting a name." },
        display_name: { type: "string" },
        aliases: { type: "array", items: { type: "string" } },
        face_ref: { type: "string" },
        enrolled: { type: "boolean" },
        facts: { type: "array", items: { type: "string" } },
        open_threads: { type: "array", items: { type: "string" } },
      },
      required: ["display_name"],
    },
  },
  {
    type: "function" as const,
    name: "log_interaction",
    description: "Store facts extracted from the current conversation.",
    parameters: {
      type: "object",
      properties: {
        person_id: { type: "string" },
        transcript_ref: { type: "string" },
        extracted_facts: { type: "array", items: { type: "string" } },
        follow_ups: { type: "array", items: { type: "string" } },
      },
      required: ["person_id", "transcript_ref"],
    },
  },
  {
    type: "function" as const,
    name: "brief",
    description: "Return a 2-sentence whisper for the HUD card.",
    parameters: {
      type: "object",
      properties: { person_id: { type: "string" } },
      required: ["person_id"],
    },
  },
];
