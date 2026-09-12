import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { nameKey, rosterDb } from "./sqlite.ts";

/**
 * The event roster — homework Mac does BEFORE the room, not during it.
 *
 * Two jobs:
 *  1. Name recognition. A recognizer with no prior hears "Sam at OpenAI" as "Stan". The keeper
 *     gets the roster names as a correction list, so a misheard name snaps to a real attendee.
 *  2. Instant context. The first time someone says their name, the card already knows who they
 *     are, with a source — no waiting on a live search mid-handshake.
 *
 * A roster entry is NOT a person you met. It never appears in the ledger and never becomes a
 * Person until you actually meet them; then its lines are copied in with their urls intact.
 * ponytail: one table, name_key primary key, whole record as JSON.
 */

export type RosterEntry = {
  name: string;
  org?: string;
  role?: string;
  blurb?: string;
  url?: string;
  /** Which pre-flight query turned this up — provenance for the roster itself. */
  found_by: string;
  ts: string;
};

const SCHEMA = `CREATE TABLE IF NOT EXISTS roster(
  name_key TEXT PRIMARY KEY, json TEXT NOT NULL, updated_at TEXT NOT NULL);`;

function db(): DatabaseSync {
  const handle = rosterDb();
  handle.exec(SCHEMA);
  return handle;
}

export function saveRoster(entries: RosterEntry[]) {
  const stmt = db().prepare(
    `INSERT INTO roster(name_key, json, updated_at) VALUES(?,?,?)
     ON CONFLICT(name_key) DO UPDATE SET json=excluded.json, updated_at=excluded.updated_at`,
  );
  for (const entry of entries) {
    if (!entry.name?.trim()) continue;
    stmt.run(nameKey(entry.name), JSON.stringify(entry), new Date().toISOString());
  }
}

/**
 * A fresh clone has no DB, so the roster ships as a committed file and loads itself on first read.
 * Re-run `npm run roster:export` after an import to refresh it.
 */
function hydrate() {
  const g = globalThis as { __mmgRosterHydrated?: boolean };
  if (g.__mmgRosterHydrated) return;
  g.__mmgRosterHydrated = true;
  try {
    const row = db().prepare("SELECT COUNT(*) AS n FROM roster").get() as { n: number };
    if (row.n > 0) return;
    const file = process.env.MEMORY_ROSTER_FILE ?? join(process.cwd(), "roster.json");
    const entries = JSON.parse(readFileSync(file, "utf8")) as RosterEntry[];
    saveRoster(entries);
    console.log(`[roster] loaded ${entries.length} from ${file}`);
  } catch {
    // No file, no roster — the demo still works, it just has no homework.
  }
}

export function listRoster(): RosterEntry[] {
  try {
    hydrate();
    return db()
      .prepare("SELECT json FROM roster")
      .all()
      .map((r) => JSON.parse((r as { json: string }).json) as RosterEntry);
  } catch {
    return [];
  }
}

export function clearRoster() {
  db().exec("DELETE FROM roster");
}

/** Exact, then first-name, then one-edit — "Stan" finds "Sam" only if nothing better matches. */
export function lookupRoster(name: string): RosterEntry | null {
  const key = nameKey(name);
  if (!key) return null;
  const all = listRoster();
  const exact = all.find((e) => nameKey(e.name) === key);
  if (exact) return exact;
  // A first name is enough only if exactly one person at this event has it. Two Chrises: neither.
  const firsts = all.filter((e) => nameKey(e.name).split(" ")[0] === key);
  if (firsts.length === 1) return firsts[0];
  if (firsts.length > 1) return null;
  const near = all.filter((e) => close(nameKey(e.name).split(" ")[0], key));
  return near.length === 1 ? near[0] : null;
}

/** Levenshtein ≤ 1 on short names, ≤ 2 on longer ones. Ambiguity is never resolved by guessing. */
function close(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return false;
  const budget = Math.min(a.length, b.length) >= 6 ? 2 : 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length] <= budget;
}

/**
 * Roster lines for someone we just met, or none.
 * A full name matches on its own. A bare first name must be corroborated by an employer the person
 * actually said — the same rule that keeps live research from banking a stranger's biography.
 */
export function rosterFacts(displayName: string, saidText: string, ts = new Date().toISOString()) {
  const entry = lookupRoster(displayName);
  if (!entry) return [];
  // The roster is scoped to people who are actually at this event, and lookupRoster already
  // refuses an ambiguous first name. So a match here is either the full name, the only person
  // here with that first name, or corroborated by the employer they just said.
  // "Oxen.ai" on a profile page and "Oxen AI" out of a transcript are the same company.
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const orgSaid = Boolean(entry.org) && squash(saidText).includes(squash(entry.org!));
  if (!entry.blurb && !orgSaid) return [];
  const head = [entry.org, entry.role].filter(Boolean).join(", ");
  const line = [head, entry.blurb].filter(Boolean).join(" — ").slice(0, 180);
  return line
    ? [{ text: `${line} (event roster)`, source: "exa" as const, ts, url: entry.url }]
    : [];
}
