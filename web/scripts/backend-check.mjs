// Show the backend working, end to end, against a running dev server. Run: npm run backend:check
const BASE = process.env.MMG_URL ?? "http://127.0.0.1:3000";
const line = (s = "") => console.log(s);

const runtime = await fetch(`${BASE}/api/runtime`).then((r) => r.json()).catch(() => null);
if (!runtime) {
  console.error(`No server at ${BASE}. Start it: npm run dev`);
  process.exit(1);
}
line(`backend   ${runtime.backend.kind}${runtime.backend.model ? ` · ${runtime.backend.model}` : ""}`);
line(`store     ${runtime.backend.store}`);
line(`roster    ${runtime.roster.count} people, ${runtime.roster.with_context} with real context`);
line(`people    ${runtime.counts.people} banked (${runtime.counts.enrolled} face-enrolled)`);
line(`health    ${Object.entries(runtime.health).map(([k, v]) => `${k}=${v}`).join(" ")}`);
line();

const SAY = process.argv[2] ?? "Hey, nice to meet you, I am Greg, my company is Oxen AI and I'll send you the repo link";
line(`heard     “${SAY}”`);
const started = Date.now();
const result = await fetch(`${BASE}/api/delegate`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ delegation_id: `check_${Date.now()}`, transcripts: [{ role: "user", text: SAY }] }),
}).then((r) => r.json());
line(`detected  ${(result.signals ?? []).map((s) => `${s.kind}=${s.value}`).join(" · ") || "nothing"}`);
line(`card      ${result.card}`);
line(`took      ${Date.now() - started} ms`);
line();

await new Promise((r) => setTimeout(r, 6000)); // let the slow plane finish
const after = await fetch(`${BASE}/api/runtime${result.person ? `?person=${result.person.id}` : ""}`).then((r) => r.json());
const trace = after.traces[0];
if (trace) line(`tools     ${trace.tools.join(" → ") || "none this turn"}`);
line(`research  ${after.jobs.map((j) => `${j.status}: ${j.result}`).slice(-1)[0] ?? "no job"}`);

if (result.person) {
  const person = await fetch(`${BASE}/api/memory/people`)
    .then((r) => r.json())
    .then((d) => d.people.find((p) => p.id === result.person.id));
  line();
  line(`banked    ${person.display_name}${person.org ? ` · ${person.org}` : ""}`);
  for (const f of person.facts) line(`          [${f.source}] ${f.text.slice(0, 90)}${f.url ? `  ${f.url}` : ""}`);
  for (const t of person.open_threads) line(`          ↳ ${t}`);
  line();
  line(`wiki      web/data/wiki/who/people/ — the page the agent maintains, ${after.page ? `${after.page.split("\n").length} lines` : "not rendered"}`);
}
line();
line("Full reference: docs/BACKEND.md");
