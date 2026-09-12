import type { CoachMode, LoopHealth } from "../types";

/**
 * Lisa + Jake share this. Realtime loop must never await enrichment.
 * Token pool: OpenAI → OpenRouter → Oxen.
 *
 * Orchestration: GPT Live **client delegation**.
 * https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
 * Live session only speaks. We own context, tools, and what gets appended back.
 */

let mode: CoachMode = "coach";
let lastGlassesAt = 0;
const GLASSES_TTL_MS = 8_000;

let health: LoopHealth = {
  realtime: "down",
  memory: "ok",
  enrichment: "idle",
  input: "browser",
  glasses: false,
  model_pool: "openai",
};

export function getMode() {
  return mode;
}

export function setMode(next: CoachMode) {
  mode = next;
  return mode;
}

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
  };
}

export function patchHealth(patch: Partial<LoopHealth>) {
  health = { ...health, ...patch };
  return health;
}

/** Short live-model prompt: when to ask the backend, not how to run tools. */
export const LIVE_INSTRUCTIONS = {
  coach: `You are MMG, a wearable social copilot at a networking event.
Whisper short context. Never lecture.

Delegation policy:
Backend tools:
- Memory: recall who someone is, enroll a consenting name, log a new fact, write a 2-sentence whisper card.
Delegate to the backend when:
- you hear a name, an introduction, or an enrolled-face hint
- a new fact or open thread appears
Do not delegate for small talk that does not identify anyone.
Do not invent people or facts. Wait for the backend result before claiming memory.
Privacy: only enrolled, consenting demo participants may be face-matched.
Strangers: capture the spoken name. No camera lookup.`,

  roast: `Same copilot, roast-me mode. After the backend returns a card, one dry
specific jab per turn using remembered facts. Never punch down. Still delegate
memory the same way. Do not roast until the backend confirms who they are.`,
};

export const BACKEND_INSTRUCTIONS = `## Voice conversation context
You are helping MMG in a live voice conversation at a networking event.
Transcripts can contain mistakes, unfinished phrases, and later corrections.
Use the latest context and verified memory records. If a needed detail is
still unclear, ask for that detail instead of guessing.

## Task instructions
- recall(face_ref | name) — enrolled faces only; strangers are name-capture
- upsert_person — enroll only with consent / spoken introduction
- log_interaction — extract facts and follow-ups from this turn
- brief — 2-sentence whisper card for the HUD
Never call Exa or treg from this path; enrichment is a separate killable queue.
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
    description: "Create or update a person. Enroll only with consent.",
    parameters: {
      type: "object",
      properties: {
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
