import type { Fact, Person } from "../types";
import { detect } from "./detect.ts";

/**
 * F3 — research processing. Pure functions, no I/O. Lisa's queue.ts wraps callExa with them:
 *   const q = researchQuery(person); if (!q) skip;
 *   const facts = absorbResearch(person, results, "exa");
 *   if (facts.length) upsertPerson({ id: person.id, display_name: person.display_name, facts });
 * D18: name gate, ≤ 2 facts per run, URL in text.
 */

export type ResearchResult = {
  title?: string;
  url: string;
  text?: string;
  highlights?: string[];
};

const MAX_FACTS = 2;
const BOILERPLATE = /spoken-name capture/i;

/** Never a bare first name. "" = unqueryable → the queue skips (a skip, not a bad search). */
export function researchQuery(person: Person): string {
  const name = person.display_name.trim();
  const live = person.facts
    .filter((f) => f.source === "live" && !BOILERPLATE.test(f.text))
    .sort((a, b) => b.ts.localeCompare(a.ts))
    .slice(0, 2)
    .map((f) => f.text);
  // The employer the model understood beats anything a regex can scrape; the detector is the floor.
  const signals = detect(live.join(". "));
  const company = person.org?.trim() || signals.find((s) => s.kind === "company")?.value;
  // No employer or project means nothing to pin the search to, and an unpinned search finds someone
  // else with the same name. That is a skip, not a bad search.
  if (!company) return "";
  const role = signals.find((s) => s.kind === "role")?.value;
  return [`"${name}"`, company, role ?? ""].join(" ").trim().slice(0, 200);
}

/**
 * Keep a result only if it is confidently THIS person.
 * A bare first name is not identity: searching "Jake" returns every Jake on the internet, and a
 * wrong-person fact on the card is worse than no fact. So a single-word name must be corroborated
 * by a context token the person actually said (their company or project); a full name stands alone.
 */
export function absorbResearch(
  person: Person,
  results: ResearchResult[],
  source: Extract<Fact["source"], "exa" | "treg"> = "exa",
  ts = new Date().toISOString(),
  context: string[] = [],
): Fact[] {
  const name = person.display_name.trim().toLowerCase();
  const tokens = [person.org ?? "", ...context]
    .map((c) => c.toLowerCase().trim())
    .filter((c) => c.length > 2);
  // A name alone is never identity, a full name included: "Seth Tam" matched a GitHub bug filed by
  // a different Seth, and a SOLIDWORKS talk by "Seth Tams". Without something the person actually
  // told us to corroborate against, we bank nothing.
  if (tokens.length === 0) return [];
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const named = new RegExp(String.raw`\b` + escaped + String.raw`\b`);
  const seen = new Set<string>();
  const facts: Fact[] = [];
  for (const r of results) {
    if (facts.length >= MAX_FACTS) break;
    if (!r.url || seen.has(r.url)) continue;
    const hay = [r.title, r.text, ...(r.highlights ?? [])].join(" ").toLowerCase();
    if (!named.test(hay)) continue;
    if (!tokens.some((t) => hay.includes(t))) continue;
    seen.add(r.url);
    const title = tidy(r.title ?? "") || "untitled";
    // A "highlight" is often just rule lines or nav junk; keep it only if it's really a sentence.
    const candidate = firstSentence(tidy(r.highlights?.[0] ?? r.text ?? ""));
    const sentence = (candidate.match(/[A-Za-z]/g)?.length ?? 0) >= 12 ? candidate : "";
    const text = (sentence && !sentence.toLowerCase().startsWith(title.toLowerCase())
      ? `${title} — ${sentence}`
      : title
    ).slice(0, 180);
    // "Jake Joyner" and "Jake Joyner — CV" say nothing the card doesn't already have. A fact has to
    // carry something beyond the person's own name to be worth a line.
    const substance = text.toLowerCase().split(name).join("").replace(/[^a-z0-9]/g, "");
    if (substance.length < 15) continue;
    facts.push({ text, source, ts, url: r.url });
  }
  return facts;
}

/** Web text arrives as markdown soup: headings, pipes, bullets. Strip it before it reaches a card. */
function tidy(s: string) {
  return s
    .replace(/[#*_>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentence(s: string) {
  const one = s.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return one.length > 140 ? `${one.slice(0, 137)}…` : one;
}

function shortUrl(url: string) {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`.replace(/\/$/, "").slice(0, 60);
  } catch {
    return url.slice(0, 60);
  }
}

const EXA_MS = 4_000;

/**
 * The real research call. Owned here so the whole loop — detected context → query → name gate →
 * structured, sourced facts → memory — lives in one place instead of half in the queue.
 * Never throws: a research failure is a skipped line on the card, never a dead conversation.
 */
export async function researchPerson(
  person: Person,
  source: Extract<Fact["source"], "exa" | "treg"> = "exa",
): Promise<{ status: "done" | "skipped"; note: string; facts: Fact[] }> {
  const query = researchQuery(person);
  if (!query) {
    return { status: "skipped", note: "unqueryable — a first name with no context yet", facts: [] };
  }
  const key = process.env.EXA_API_KEY;
  if (!key) return { status: "skipped", note: `no EXA_API_KEY — would search ${query}`, facts: [] };

  let results: ResearchResult[];
  try {
    const response = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      signal: AbortSignal.timeout(EXA_MS),
      body: JSON.stringify({
        query,
        numResults: 5,
        type: "auto",
        contents: { highlights: { query, numSentences: 2 }, text: { maxCharacters: 600 } },
      }),
    });
    if (!response.ok) return { status: "skipped", note: `exa ${response.status} — skipped`, facts: [] };
    results = ((await response.json()) as { results?: ResearchResult[] }).results ?? [];
  } catch {
    return { status: "skipped", note: `exa timeout (${EXA_MS} ms) — skipped`, facts: [] };
  }

  // The corroborating context is what the person said about themselves this conversation.
  const context = detect(
    person.facts.filter((f) => f.source === "live").map((f) => f.text).join(". "),
  )
    .filter((sig) => sig.kind === "company" || sig.kind === "role")
    .map((sig) => sig.value);
  const facts = absorbResearch(person, results, source, new Date().toISOString(), context);
  return facts.length
    ? { status: "done", note: `${facts.length} sourced fact(s) from ${results.length} results`, facts }
    : {
        status: "done",
        note: `${results.length} results, none confidently this person — skipped rather than guess`,
        facts: [],
      };
}
