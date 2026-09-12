// Pre-flight: research the people we expect in the room, BEFORE the demo.
// Run: npm run preflight            (--clear rebuilds from scratch)
// Edit web/roster-seed.json to add or correct people.
//
// Open-web discovery of a hackathon attendee list does not work — a same-day event has nothing
// indexed. So we do the thing that does: take the names we already know (the team roster in
// MMG.aDNA/who/team.md lives in roster-seed.json) and research each one properly, plus read the
// event page itself for organisers and judges.
import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) process.env[line.slice(0, eq).trim()] ??= line.slice(eq + 1).trim();
}

const seed = JSON.parse(readFileSync(join(process.cwd(), "roster-seed.json"), "utf8"));
const { saveRoster, listRoster, clearRoster } = await import("../src/lib/memory/roster.ts");
if (process.argv.includes("--clear")) clearRoster();

const MODEL = process.env.BACKEND_MODEL ?? "gpt-5.4-mini";

async function exaSearch(query) {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({ query, numResults: 5, type: "auto", contents: { text: { maxCharacters: 2000 } } }),
  });
  return res.ok ? ((await res.json()).results ?? []) : [];
}

async function exaContents(urls) {
  const res = await fetch("https://api.exa.ai/contents", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({ urls, text: { maxCharacters: 6000 } }),
  });
  return res.ok ? ((await res.json()).results ?? []) : [];
}

async function ask(instructions, input, schema) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "low" },
      instructions,
      input,
      text: { format: { type: "json_schema", name: "out", strict: true, schema } },
    }),
  });
  if (!res.ok) {
    console.error(`  model ${res.status}: ${(await res.text()).slice(0, 140)}`);
    return null;
  }
  const data = await res.json();
  const text =
    data.output_text ??
    data.output?.find((o) => o.type === "message")?.content?.find((c) => c.text)?.text ??
    "{}";
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const PERSON_SCHEMA = {
  type: "object",
  properties: {
    confident: { type: "boolean" },
    org: { type: "string" },
    role: { type: "string" },
    blurb: { type: "string" },
    url: { type: "string" },
  },
  required: ["confident", "org", "role", "blurb", "url"],
  additionalProperties: false,
};

const ts = new Date().toISOString();
const entries = [];

// 1. Each known person, researched on their own with their hint as the corroboration.
for (const person of seed.people) {
  const results = await exaSearch(`"${person.name}" ${person.hint}`);
  if (!results.length) {
    console.log(`  —  ${person.name}: no results`);
    continue;
  }
  const source = results
    .map((r) => `# ${r.title}\n${r.url}\n${(r.text ?? "").slice(0, 1200)}`)
    .join("\n\n---\n\n");
  const out = await ask(
    "Decide whether these search results are about the SPECIFIC person named, using the hint to " +
      "disambiguate — many people share a name. If they are, give their organisation, their role, one " +
      "factual sentence about what they work on (<= 140 chars, no marketing language), and the single " +
      "best source url. If the results are about a different person or you cannot tell, set confident " +
      "to false and leave the other fields empty. Never invent details.",
    `Person: ${person.name}\nHint: ${person.hint}\nEvent: ${seed.event.name}\n\n${source}`,
    PERSON_SCHEMA,
  );
  if (out?.confident && out.blurb) {
    entries.push({ name: person.name, org: out.org, role: out.role, blurb: out.blurb, url: out.url, found_by: `seed: ${person.hint}`, ts });
    console.log(`  ✓  ${person.name} — ${out.org || "?"} · ${out.blurb.slice(0, 70)}`);
  } else {
    // Still worth knowing the name is in the room, even with nothing behind it.
    entries.push({ name: person.name, org: "", role: "", blurb: "", url: "", found_by: `seed: ${person.hint} (no confident match)`, ts });
    console.log(`  ·  ${person.name} — name only, nothing confident found`);
  }
}

// 2. The event page itself — organisers, judges, sponsors.
const pages = await exaContents(seed.event.pages);
if (pages.length) {
  const out = await ask(
    "Extract people named on this event page — organisers, hosts, judges, speakers, sponsor contacts. " +
      "Only people actually named in the text. For each: name as written, organisation, and one short " +
      "factual line. Never invent a person.",
    pages.map((p) => `# ${p.title}\n${p.url}\n${(p.text ?? "").slice(0, 5000)}`).join("\n\n---\n\n"),
    {
      type: "object",
      properties: {
        people: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, org: { type: "string" }, blurb: { type: "string" } },
            required: ["name", "org", "blurb"],
            additionalProperties: false,
          },
        },
      },
      required: ["people"],
      additionalProperties: false,
    },
  );
  for (const p of out?.people ?? []) {
    entries.push({ ...p, role: "", url: seed.event.pages[0], found_by: "event page", ts });
    console.log(`  ✓  ${p.name} — from the event page`);
  }
} else {
  console.log("  ·  event page returned nothing (Exa may not have it indexed)");
}

saveRoster(entries);
console.log(`\nroster: ${listRoster().length} people · ${entries.filter((e) => e.blurb).length} with real context`);
