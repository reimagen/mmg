import type { Fact, Person } from "../types";

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
  if (!name.includes(" ") && live.length === 0) return "";
  return [`"${name}"`, ...live, person.first_met.event].join(" ").slice(0, 200);
}

/** Keep a result only if the full display_name appears in title/text/highlights. One fact per result, dedupe by URL. */
export function absorbResearch(
  person: Person,
  results: ResearchResult[],
  source: Extract<Fact["source"], "exa" | "treg"> = "exa",
  ts = new Date().toISOString(),
): Fact[] {
  const name = person.display_name.trim().toLowerCase();
  const seen = new Set<string>();
  const facts: Fact[] = [];
  for (const r of results) {
    if (facts.length >= MAX_FACTS) break;
    if (!r.url || seen.has(r.url)) continue;
    const hay = [r.title, r.text, ...(r.highlights ?? [])].join(" ").toLowerCase();
    if (!hay.includes(name)) continue;
    seen.add(r.url);
    const sentence = firstSentence(r.highlights?.[0] ?? r.text ?? "");
    const title = (r.title ?? "").trim() || "untitled";
    facts.push({ text: [title, sentence, shortUrl(r.url)].filter(Boolean).join(" — "), source, ts });
  }
  return facts;
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
