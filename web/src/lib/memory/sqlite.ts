import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { writeIndex, writePersonPage } from "./wiki.ts";
import type {
  Fact,
  Interaction,
  LogInteractionInput,
  Person,
  RecallQuery,
  UpsertPersonInput,
} from "../types";

/**
 * Jake's lane — SQLite behind Lisa's five-function seam (D17).
 * Same signatures as store.ts. Node built-in `node:sqlite`, zero deps.
 * Whole typed object lives in a `json` column; SQL columns exist only for lookup.
 * ponytail: JSON columns, no migrations — a demo, not a product.
 */

const DB_PATH =
  process.env.MEMORY_DB_PATH ?? join(process.cwd(), "data", "memory.db");

const RANK: Record<Fact["source"], number> = {
  live: 0,
  enrollment: 1,
  manual: 2,
  exa: 3,
  treg: 4,
};

const SCHEMA = `
PRAGMA journal_mode=WAL;
PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS person(
  id TEXT PRIMARY KEY, name_key TEXT, face_ref TEXT,
  json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS person_name ON person(name_key);
CREATE INDEX IF NOT EXISTS person_face ON person(face_ref);
CREATE TABLE IF NOT EXISTS interaction(
  id TEXT PRIMARY KEY, person_id TEXT NOT NULL, ts TEXT NOT NULL, json TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS interaction_person ON interaction(person_id, ts);
PRAGMA user_version=1;`;

function db(): DatabaseSync {
  // ponytail: one handle per process, cached on globalThis so `next dev` HMR doesn't reopen it.
  const g = globalThis as { __mmgMemoryDb?: DatabaseSync };
  if (g.__mmgMemoryDb) return g.__mmgMemoryDb;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const handle = new DatabaseSync(DB_PATH);
  handle.exec(SCHEMA);
  g.__mmgMemoryDb = handle;
  return handle;
}

const nowIso = () => new Date().toISOString();

export function nameKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

const parse = (row: unknown) => JSON.parse((row as { json: string }).json) as Person;

function save(p: Person) {
  db()
    .prepare(
      `INSERT INTO person(id, name_key, face_ref, json, updated_at) VALUES(?,?,?,?,?)
       ON CONFLICT(id) DO UPDATE SET name_key=excluded.name_key, face_ref=excluded.face_ref,
         json=excluded.json, updated_at=excluded.updated_at`,
    )
    .run(p.id, nameKey(p.display_name), p.face_ref, JSON.stringify(p), nowIso());
  projectWiki(p);
}

/** LLM-Wiki mirror: who/people/<name>.md + index, rewritten on every save. Never blocks a write on failure. */
function projectWiki(p: Person) {
  try {
    writePersonPage(p, recentInteractions(p.id));
    writeIndex(listPeople());
  } catch (error) {
    console.error("[memory] wiki projection failed", error);
  }
}

export function recentInteractions(personId: string, limit = 5): Interaction[] {
  return db()
    .prepare("SELECT json FROM interaction WHERE person_id = ? ORDER BY ts DESC LIMIT ?")
    .all(personId, limit)
    .map((r) => JSON.parse((r as { json: string }).json) as Interaction);
}

function byId(id: string): Person | null {
  const row = db().prepare("SELECT json FROM person WHERE id = ?").get(id);
  return row ? parse(row) : null;
}

function find(query: RecallQuery): Person | null {
  if (query.face_ref) {
    const row = db()
      .prepare("SELECT json FROM person WHERE face_ref = ?")
      .get(query.face_ref);
    if (row) {
      const p = parse(row);
      if (p.enrolled) return p;
    }
  }
  if (query.name) {
    const key = nameKey(query.name);
    const row = db().prepare("SELECT json FROM person WHERE name_key = ?").get(key);
    if (row) return parse(row);
    // ponytail: alias lookup is a scan — people table is tens of rows. Index aliases if it ever isn't.
    for (const r of db().prepare("SELECT json FROM person").all()) {
      const p = parse(r);
      if (p.aliases.some((a) => nameKey(a) === key)) return p;
    }
  }
  return null;
}

/** Reads never throw (miss or broken DB → null / []). Writes rethrow so the delegate route's catch shows "Memory skipped". */
export function recall(query: RecallQuery): Person | null {
  try {
    const hit = find(query);
    if (!hit) return null;
    hit.last_seen = nowIso();
    save(hit);
    return hit;
  } catch (error) {
    console.error("[memory] recall failed", error);
    return null;
  }
}

export function upsertPerson(input: UpsertPersonInput): Person {
  const ts = nowIso();
  const existing = input.id
    ? byId(input.id)
    : find({ name: input.display_name, face_ref: input.face_ref ?? undefined });

  if (existing) {
    existing.display_name = input.display_name;
    existing.aliases = input.aliases ?? existing.aliases;
    if (input.face_ref !== undefined) existing.face_ref = input.face_ref;
    if (input.enrolled !== undefined) existing.enrolled = input.enrolled;
    if (input.first_met) existing.first_met = input.first_met;
    if (input.facts) existing.facts = mergeFacts(existing.facts, input.facts);
    if (input.open_threads) {
      existing.open_threads = [...new Set([...existing.open_threads, ...input.open_threads])];
    }
    existing.last_seen = ts;
    save(existing);
    return existing;
  }

  const person: Person = {
    id: input.id ?? `person_${randomUUID().slice(0, 8)}`,
    display_name: input.display_name,
    aliases: input.aliases ?? [],
    face_ref: input.face_ref ?? null,
    enrolled: input.enrolled ?? false,
    first_met: input.first_met ?? { event: "hackathon floor", ts },
    facts: mergeFacts([], input.facts ?? []),
    open_threads: input.open_threads ?? [],
    last_seen: ts,
  };
  save(person);
  return person;
}

export function logInteraction(input: LogInteractionInput): Interaction {
  const interaction: Interaction = {
    id: `ix_${randomUUID().slice(0, 8)}`,
    ts: nowIso(),
    person_id: input.person_id,
    transcript_ref: input.transcript_ref, // D20: a ref, never the transcript text
    extracted_facts: input.extracted_facts ?? [],
    follow_ups: input.follow_ups ?? [],
  };
  db()
    .prepare("INSERT INTO interaction(id, person_id, ts, json) VALUES(?,?,?,?)")
    .run(interaction.id, interaction.person_id, interaction.ts, JSON.stringify(interaction));

  const person = byId(input.person_id);
  if (person) {
    person.facts = mergeFacts(
      person.facts,
      absorbFacts(person, interaction.extracted_facts, "live", interaction.ts),
    );
    if (interaction.follow_ups.length) {
      person.open_threads = [...new Set([...person.open_threads, ...interaction.follow_ups])];
    }
    person.last_seen = interaction.ts;
    save(person);
  }
  return interaction;
}

/** F4 / D19: ranked template, never an LLM. live > enrollment > manual > exa > treg, newest first. ≤ 220 chars. */
export function brief(personId: string): string {
  let person: Person | null = null;
  try {
    person = byId(personId);
  } catch (error) {
    console.error("[memory] brief failed", error);
  }
  if (!person) return "Unknown. Capture the name out loud and enroll.";

  const ranked = [...person.facts].sort(
    (a, b) => RANK[a.source] - RANK[b.source] || b.ts.localeCompare(a.ts),
  );
  const s1 = ranked[0]?.text ?? "just met";
  const thread = person.open_threads[0];
  const s2 =
    ranked[1]?.text ?? (thread ? `Ask about: ${thread}` : `met at ${person.first_met.event}`);
  const dot = (s: string) => s.trim().replace(/[.!?]+$/, "");
  return `${person.display_name} — ${dot(s1)}. ${dot(s2)}.`.slice(0, 220);
}

/** Demo reset: clear rows in place (safe under a running next dev — never unlink the file). */
export function wipe() {
  db().exec("DELETE FROM interaction; DELETE FROM person;");
  writeIndex([]);
}

/** F5: newest last_seen first. */
export function listPeople(): Person[] {
  try {
    return db()
      .prepare("SELECT json FROM person ORDER BY json_extract(json, '$.last_seen') DESC, rowid DESC")
      .all()
      .map(parse);
  } catch (error) {
    console.error("[memory] listPeople failed", error);
    return [];
  }
}

/** F2: clean heard utterances into facts — strip intro phrase, trim, drop < 12 chars, drop name-only, cap 180. */
export function absorbFacts(
  person: Pick<Person, "display_name">,
  texts: string[],
  source: Fact["source"],
  ts = nowIso(),
): Fact[] {
  const name = nameKey(person.display_name);
  const out: Fact[] = [];
  for (const raw of texts) {
    const text = raw
      .replace(/nice to meet you[, ]*/gi, "")
      .replace(/^[\s,.;:-]+/, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
    if (text.length < 12) continue;
    if (nameKey(text).replace(/[^a-z]/g, "") === name.replace(/[^a-z]/g, "")) continue;
    out.push({ text, source, ts });
  }
  return out;
}

function mergeFacts(existing: Fact[], incoming: Fact[]): Fact[] {
  const seen = new Set(existing.map((f) => f.text.toLowerCase()));
  const merged = [...existing];
  for (const fact of incoming) {
    const key = fact.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(fact);
  }
  return merged;
}
