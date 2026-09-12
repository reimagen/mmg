import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Fact,
  Interaction,
  LogInteractionInput,
  Person,
  RecallQuery,
  UpsertPersonInput,
} from "../types";

/**
 * Jake's lane.
 *
 * Hour 1 contract: recall / upsert / log / brief.
 * Swap this JSON file for SQLite (`person` + `interaction` tables,
 * JSON facts column). Reads must stay under 150ms. Writes can be async.
 *
 * Do NOT add a vector store for the demo.
 */

type Store = {
  people: Person[];
  interactions: Interaction[];
};

const DATA_PATH = join(process.cwd(), "data", "memory.json");

function nowIso() {
  return new Date().toISOString();
}

function emptyStore(): Store {
  return { people: [], interactions: [] };
}

function load(): Store {
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf8")) as Store;
  } catch {
    const seeded = seed();
    persist(seeded);
    return seeded;
  }
}

function persist(store: Store) {
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(store, null, 2));
}

function seed(): Store {
  const ts = nowIso();
  const jake: Person = {
    id: "person_jake",
    display_name: "Jake",
    aliases: ["jacob"],
    face_ref: "enrolled:jake",
    enrolled: true,
    first_met: { event: "OpenAI Global Hackathon @ The KINN", ts },
    facts: [
      {
        text: "Building the persistent memory system",
        source: "enrollment",
        ts,
      },
      { text: "Owns SQLite schema + recall API", source: "enrollment", ts },
    ],
    open_threads: ["Ask about the schema."],
    last_seen: ts,
  };
  const luis: Person = {
    id: "person_luis",
    display_name: "Luis",
    aliases: [],
    face_ref: "enrolled:luis",
    enrolled: true,
    first_met: { event: "OpenAI Global Hackathon @ The KINN", ts },
    facts: [
      {
        text: "Owns glasses ↔ GPT Live bridge + research agents",
        source: "enrollment",
        ts,
      },
    ],
    open_threads: ["Glasses streaming reliability — fall back early if flaky."],
    last_seen: ts,
  };
  return { people: [jake, luis], interactions: [] };
}

function normalize(name: string) {
  return name.trim().toLowerCase();
}

export function recall(query: RecallQuery): Person | null {
  const started = Date.now();
  const store = load();
  let hit: Person | undefined;

  if (query.face_ref) {
    hit = store.people.find(
      (p) => p.enrolled && p.face_ref === query.face_ref,
    );
  }

  if (!hit && query.name) {
    const n = normalize(query.name);
    hit = store.people.find(
      (p) =>
        normalize(p.display_name) === n ||
        p.aliases.some((a) => normalize(a) === n),
    );
  }

  if (hit) {
    hit.last_seen = nowIso();
    persist(store);
  }

  if (Date.now() - started > 150) {
    console.warn("[memory] recall exceeded 150ms budget");
  }

  return hit ?? null;
}

export function upsertPerson(input: UpsertPersonInput): Person {
  const store = load();
  const ts = nowIso();
  const existing = input.id
    ? store.people.find((p) => p.id === input.id)
    : recall({
        name: input.display_name,
        face_ref: input.face_ref ?? undefined,
      });

  if (existing) {
    existing.display_name = input.display_name;
    existing.aliases = input.aliases ?? existing.aliases;
    if (input.face_ref !== undefined) existing.face_ref = input.face_ref;
    if (input.enrolled !== undefined) existing.enrolled = input.enrolled;
    if (input.first_met) existing.first_met = input.first_met;
    if (input.facts) existing.facts = mergeFacts(existing.facts, input.facts);
    if (input.open_threads) {
      existing.open_threads = Array.from(
        new Set([...existing.open_threads, ...input.open_threads]),
      );
    }
    existing.last_seen = ts;
    persist(store);
    return existing;
  }

  const person: Person = {
    id: input.id ?? `person_${randomUUID().slice(0, 8)}`,
    display_name: input.display_name,
    aliases: input.aliases ?? [],
    face_ref: input.face_ref ?? null,
    enrolled: input.enrolled ?? false,
    first_met: input.first_met ?? { event: "hackathon floor", ts },
    facts: input.facts ?? [],
    open_threads: input.open_threads ?? [],
    last_seen: ts,
  };
  store.people.push(person);
  persist(store);
  return person;
}

export function logInteraction(input: LogInteractionInput): Interaction {
  const store = load();
  const interaction: Interaction = {
    id: `ix_${randomUUID().slice(0, 8)}`,
    ts: nowIso(),
    person_id: input.person_id,
    transcript_ref: input.transcript_ref,
    extracted_facts: input.extracted_facts ?? [],
    follow_ups: input.follow_ups ?? [],
  };
  store.interactions.push(interaction);

  const person = store.people.find((p) => p.id === input.person_id);
  if (person) {
    const facts: Fact[] = (input.extracted_facts ?? []).map((text) => ({
      text,
      source: "live",
      ts: interaction.ts,
    }));
    person.facts = mergeFacts(person.facts, facts);
    if (input.follow_ups?.length) {
      person.open_threads = Array.from(
        new Set([...person.open_threads, ...input.follow_ups]),
      );
    }
    person.last_seen = interaction.ts;
  }

  persist(store);
  return interaction;
}

export function brief(personId: string): string {
  const store = load();
  const person = store.people.find((p) => p.id === personId);
  if (!person) return "Unknown. Capture the name out loud and enroll.";

  const fact = person.facts[0]?.text ?? "just met";
  const thread = person.open_threads[0];
  const since = person.first_met.event;
  return thread
    ? `${person.display_name} — ${fact}. ${thread}`
    : `${person.display_name} — met at ${since}; ${fact}.`;
}

export function listPeople(): Person[] {
  return load().people;
}

function mergeFacts(existing: Fact[], incoming: Fact[]): Fact[] {
  const seen = new Set(existing.map((f) => f.text.toLowerCase()));
  const merged = [...existing];
  for (const fact of incoming) {
    if (seen.has(fact.text.toLowerCase())) continue;
    seen.add(fact.text.toLowerCase());
    merged.push(fact);
  }
  return merged;
}
