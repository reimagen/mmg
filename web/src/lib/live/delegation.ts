import { brief, listPeople, logInteraction, recall, upsertPerson } from "@/lib/memory";
import { enqueueEnrichment } from "@/lib/enrichment/queue";
import { getMode } from "@/lib/supervisor";
import type { Person } from "@/lib/types";
import type { DelegateRequest, DelegateResult, TranscriptTurn } from "./types";

const INTRO = /nice to meet you[, ]+([A-Za-z][a-zA-Z-]+)/i;

export function handleClientDelegation(req: DelegateRequest): DelegateResult {
  const userText = recentUserText(req.transcripts);
  const person = resolvePerson(userText, req);
  const mode = getMode();

  if (!person) {
    return {
      delegation_id: req.delegation_id,
      thinking:
        "No enrolled match. Capture a spoken name. Do not look up faces of strangers.",
      commentary:
        "I don't have them yet. If they say their name, I'll remember it.",
      card: "Unknown. Say “nice to meet you, NAME.”",
      person: null,
      miss: true,
    };
  }

  const facts = extractFacts(userText, person.display_name);
  if (facts.length) {
    logInteraction({
      person_id: person.id,
      transcript_ref: `live:${req.delegation_id}`,
      extracted_facts: facts,
    });
  }

  enqueueEnrichment(person.id, person.display_name, "exa");

  const whisper = brief(person.id);
  const thinking = [
    `Person: ${person.display_name} (${person.id})`,
    `Enrolled: ${person.enrolled}`,
    `Facts: ${person.facts.map((f) => f.text).join("; ") || "none"}`,
    `Open threads: ${person.open_threads.join("; ") || "none"}`,
    `Whisper card: ${whisper}`,
  ].join("\n");

  const commentary =
    mode === "roast"
      ? roastLine(person, whisper)
      : whisper;

  return {
    delegation_id: req.delegation_id,
    thinking: clip(thinking),
    commentary: clip(commentary),
    card: whisper,
    person,
    miss: false,
  };
}

function resolvePerson(userText: string, req: DelegateRequest): Person | null {
  const intro = userText.match(INTRO)?.[1];
  if (intro) {
    return upsertPerson({
      display_name: capitalize(intro),
      enrolled: false,
      facts: [
        {
          text: "Met via spoken-name capture (no camera lookup)",
          source: "live",
          ts: new Date().toISOString(),
        },
      ],
    });
  }

  if (req.face_ref) {
    const byFace = recall({ face_ref: req.face_ref });
    if (byFace) return byFace;
  }

  const name = guessName(userText);
  if (name) {
    const byName = recall({ name });
    if (byName) return byName;
  }

  if (req.last_person_id) {
    return listPeople().find((p) => p.id === req.last_person_id) ?? null;
  }

  return name ? recall({ name }) : null;
}

function recentUserText(transcripts: TranscriptTurn[]) {
  return transcripts
    .filter((t) => t.role === "user")
    .slice(-6)
    .map((t) => t.text)
    .join(" ");
}

function extractFacts(text: string, name: string) {
  const cleaned = text.replace(new RegExp(name, "ig"), "").trim();
  if (cleaned.length < 24) return [];
  return [cleaned.slice(0, 180)];
}

function guessName(text: string) {
  const match = text.match(/\b([A-Z][a-z]{2,})\b/);
  return match?.[1];
}

function capitalize(name: string) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function roastLine(person: Person, whisper: string) {
  const fact = person.facts[0]?.text ?? "we just met";
  return `${whisper} Roast: still on the hook for ${fact.toLowerCase()}.`;
}

function clip(text: string) {
  return text.slice(0, 1800);
}
