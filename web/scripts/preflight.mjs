// Pre-flight: research the event BEFORE the demo so name recognition and first cards are warm.
// Run: npm run preflight            (add --clear to rebuild from scratch)
// Needs EXA_API_KEY + OPENAI_API_KEY in web/.env.local.
import { readFileSync } from "node:fs";
import { join } from "node:path";

for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq > 0 && !line.startsWith("#")) process.env[line.slice(0, eq).trim()] ??= line.slice(eq + 1).trim();
}

const EVENT = "OpenAI Global Hackathon 2026 Agents Everywhere";
const QUERIES = [
  `${EVENT} judges and speakers`,
  `${EVENT} The KINN Venice attendees`,
  `${EVENT} sponsors mentors`,
  "Oxen AI founders team",
  "MentraOS team founders",
  "Exa AI founders team",
];

const { saveRoster, listRoster, clearRoster } = await import("../src/lib/memory/roster.ts");
if (process.argv.includes("--clear")) clearRoster();

async function exa(query) {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": process.env.EXA_API_KEY },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ query, numResults: 5, type: "auto", contents: { text: { maxCharacters: 2000 } } }),
  });
  if (!res.ok) return [];
  return (await res.json()).results ?? [];
}

async function people(query, results) {
  const source = results.map((r) => `# ${r.title}\n${r.url}\n${(r.text ?? "").slice(0, 1500)}`).join("\n\n---\n\n");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(60_000),
    body: JSON.stringify({
      model: process.env.BACKEND_MODEL ?? "gpt-5.4-mini",
      reasoning: { effort: "low" },
      instructions:
        "Extract real named people from these search results — organisers, judges, speakers, mentors, " +
        "founders of the named companies. Only people actually named in the text. For each: their name as " +
        "written, their organisation, and one short factual line about them (<= 120 chars) taken from the " +
        "text. Skip anyone whose name you are inferring rather than reading. Never invent a person.",
      input: `Query: ${query}\n\n${source}`,
      text: {
        format: {
          type: "json_schema",
          name: "roster",
          strict: true,
          schema: {
            type: "object",
            properties: {
              people: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    org: { type: "string" },
                    blurb: { type: "string" },
                    url: { type: "string" },
                  },
                  required: ["name", "org", "blurb", "url"],
                  additionalProperties: false,
                },
              },
            },
            required: ["people"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!res.ok) {
    console.error(`  extraction failed: ${res.status} ${(await res.text()).slice(0, 160)}`);
    return [];
  }
  const data = await res.json();
  const text = data.output_text ?? data.output?.find((o) => o.type === "message")?.content?.find((c) => c.text)?.text ?? "{}";
  try {
    return JSON.parse(text).people ?? [];
  } catch {
    return [];
  }
}

const ts = new Date().toISOString();
let added = 0;
for (const query of QUERIES) {
  const results = await exa(query);
  const found = results.length ? await people(query, results) : [];
  saveRoster(found.map((p) => ({ ...p, found_by: query, ts })));
  added += found.length;
  console.log(`${found.length.toString().padStart(2)} from “${query}”${found.length ? ": " + found.map((p) => p.name).join(", ") : ""}`);
}
console.log(`\nroster: ${listRoster().length} people (${added} written this run)`);
