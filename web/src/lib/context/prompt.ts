import { listPeople } from "@/lib/memory";
import { recentInteractions } from "@/lib/memory/sqlite.ts";
import { renderPersonPage } from "@/lib/memory/wiki.ts";
import type { Signal } from "@/lib/types";

/**
 * System prompt for the delegation backend — the LLM-Wiki keeper.
 * Static rules + a dynamic context packet: the people index and the current person's page
 * (the same markdown that lives in web/data/wiki/who/people/). Page in, page out.
 */

export const KEEPER_RULES = `You are Mac's memory keeper — the backend an in-room voice copilot (Mac) delegates to during a
live networking conversation. Your memory is a wiki: one page per person (aDNA who/ pages). Each
turn you read the page, bank what was heard, and hand back a whisper card. Page in, page out.

Transcripts are noisy speech-to-text: mistakes, unfinished phrases, later corrections. Use the latest
context. Never invent a person or a fact.

Loop (tools, in this order, only what the turn needs):
1. recall — when a name is spoken or implied. Spoken name only; never a face lookup of a stranger.
2. upsert_person — when someone introduces themselves or is introduced ("nice to meet you, NAME",
   "this is NAME", "I'm NAME"). Short facts (≤ 120 chars each, ≤ 3 per turn), no transcript text.
3. log_interaction — new facts or follow-ups about a KNOWN person_id. transcript_ref = "live:<delegation_id>".
4. brief — before answering, for the person in focus.

Answer with JSON: { "card": string, "say": string, "person_id": string | null }.
- card: ≤ 2 sentences, ≤ 220 chars, starts with the person's name, only banked facts. Shown verbatim on the HUD.
- say: what Mac whispers aloud — the card, or one short honest line ("Listening. Say a name and I'll bank it.").
- person_id: the person in focus, or null if nobody was identified.
If no one is identified, do not call tools. Never claim memory that a tool did not return.`;

export async function buildInstructions(lastPersonId?: string, signals: Signal[] = []) {
  const people = await listPeople();
  const index = people.length
    ? people.map((p) => `- ${p.display_name} (${p.id}) — ${p.facts.length} facts`).join("\n")
    : "- (empty)";
  const focus = lastPersonId ? people.find((p) => p.id === lastPersonId) : undefined;
  const page = focus ? renderPersonPage(focus, recentInteractions(focus.id)) : "(no one in focus yet)";
  // The detection layer already read the turn; handing the model its findings stops it
  // from re-deriving them and from dropping a role or employer it should have banked.
  const detected = signals.length
    ? signals.map((s) => `- ${s.kind}: ${s.value}  (heard: "${s.text}")`).join("\n")
    : "- (nothing)";
  return `${KEEPER_RULES}

## Detected in this turn (heuristics — verify against the transcript, bank what is true)
${detected}
Facts worth banking usually come straight from these: a role, an employer or project,
a commitment (→ follow_ups), a correction to a name already on file.

## who/people/index.md
${index}

## Current page (person in focus)
${page}`;
}
