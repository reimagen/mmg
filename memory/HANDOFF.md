# memory/ — HANDOFF (Jake → team, 2026-09-12 13:xx)

**What changed (D17):** memory is now **SQLite in-process behind Lisa's `@/lib/memory` seam**,
via Node's built-in `node:sqlite` — zero deps, same five sync functions, zero consumer
changes. The Python FastAPI `:7777` sidecar is retired to `memory/legacy/`. The HTTP surface
for Saint / Hermes / UI is the existing `/api/memory/*` routes on `:3000`.

```
web/src/lib/memory/index.ts    picks backend: MEMORY_BACKEND=json → store.ts (old stub), else sqlite.ts
web/src/lib/memory/sqlite.ts   recall / upsertPerson / logInteraction / brief / listPeople (+ absorbFacts)
web/src/lib/memory/enrich.ts   researchQuery / absorbResearch — pure, for Lisa's queue.ts
web/data/memory.db             the DB (gitignored; WAL; set MEMORY_DB_PATH to move it)
web/scripts/seed.mjs           npm run seed      — wipe + load 5 people (< 1 s)
web/scripts/memory-check.mjs   npm run memory:check — self-check (upsert → recall → log → brief → reopen)
```

Requires **Node 22.13+ / 23.4+** (`node:sqlite` unflagged; verified on 26.7).

## Lisa — nothing to change on the live path

- Delete `MEMORY_API_URL` from your env / mental model. `/api/delegate` → `upsertPerson` /
  `logInteraction` / `brief` already hit SQLite. Rollback to the JSON stub: `MEMORY_BACKEND=json`.
- `brief()` is now a ranked template (D19): `live > enrollment > manual > exa > treg`, newest
  first, `"<Name> — <fact1>. <fact2 | Ask about: thread>."`, ≤ 220 chars. Spoken-name
  boilerplate ("Met via spoken-name capture") sinks below any real heard fact.
- `logInteraction` cleans `extracted_facts` (trim, drop < 12 chars, drop name-only, cap 180)
  before they become `source:"live"` facts. The `Interaction` row keeps the raw list.
- **Ask (F3, D18) — `queue.ts` `run()` patch, ~6 lines.** Make `callExa` return raw results
  (`results[]` with `title,url,text,highlights`; request `numResults: 5, contents:
  {highlights: {query}}`) and wrap it:

  ```ts
  import { absorbResearch, researchQuery } from "../memory/enrich";
  // in run(), replace the upsertPerson({... `[${job.source}] ${result.slice(0,240)}` ...}) block:
  const person = listPeople().find((p) => p.id === job.person_id);
  const query = person ? researchQuery(person) : "";
  if (!person || !query) { job.status = "skipped"; job.result = "unqueryable (first name only)"; return; }
  const results = await withTimeout(callExa(query), TIMEOUT_MS);          // now ResearchResult[] | null
  if (!results) { job.status = "skipped"; job.result = "timeout or missing key — skipped"; return; }
  const facts = absorbResearch(person, results, job.source === "treg" ? "treg" : "exa");
  job.status = "done"; job.result = facts.length ? facts.map((f) => f.text).join(" · ") : "no confident match";
  if (facts.length) upsertPerson({ id: person.id, display_name: person.display_name, facts });
  ```
  Name gate: a result is kept only if the full `display_name` appears in title/text/highlights.
  ≤ 2 facts per run, URL embedded in `text` (`"<title> — <sentence> — <host/path>"`). Until
  you patch, the current `[exa] …` write-back still works (facts land with `source:"exa"`).
- Typo fixes I made in your files so the exit gate could run (import lines only, please keep):
  `api/delegate/route.ts` was missing the `handleClientDelegation` import; `delegation.ts`
  was missing `TranscriptTurn`; `supervisor.ts` had unescaped backticks inside the
  `BACKEND_INSTRUCTIONS` template literal (broke every route importing it) and imported
  `../types` instead of `./types`; `store.ts` imported `./types` (no such file). Not touched:
  `hall/client.ts` imports `ws`, which is not in `package.json` — dev logs module-not-found
  on every delegate call (route still answers). `npm i ws` if Hermes is ever on.
- `devDependencies`: `@types/node` bumped ^20 → ^22 (types for `node:sqlite`; no runtime change).

## Luis — ledger shape

`GET /api/memory/people` → `{ people: Person[] }`, **newest `last_seen` first**. Each fact is
`{ text, source: "live"|"enrollment"|"exa"|"treg"|"manual", ts: ISO-8601 UTC }` — show
`source` + `ts` on the ledger so staleness is visible (no special "stale" flag). Card text =
`brief` (verbatim ground truth; the voice may paraphrase). Demo reset: `cd web && npm run seed`.

```sh
curl -s localhost:3000/api/memory/people | jq '.people[] | {display_name, last_seen, facts: [.facts[] | {source, text}]}'
curl -s localhost:3000/api/memory/brief -d '{"person_id":"person_jake"}' -H 'content-type: application/json'
```

## Saint — glasses (P2), unchanged

`POST /api/glasses/ingest` is unchanged. Spoken-name enroll by HTTP:

```sh
curl -s localhost:3000/api/memory/upsert -H 'content-type: application/json' \
  -d '{"display_name":"Ada","enrolled":false,"facts":[{"text":"Runs growth at Oxen","source":"live","ts":"2026-09-12T20:00:00Z"}]}'
curl -s localhost:3000/api/memory/recall -H 'content-type: application/json' -d '{"name":"Ada"}'
curl -s localhost:3000/api/memory/log -H 'content-type: application/json' \
  -d '{"person_id":"<id>","transcript_ref":"glasses:1","extracted_facts":["Ships weekly"],"follow_ups":["Ask about the weekly ship"]}'
```

LAN reach from the glasses = `NEXT_PUBLIC_MMG_API_URL` pointing at the laptop's `:3000` (D21).

## Exit gate (fresh seed → bank Ada live → survives restart)

```sh
cd web && npm run seed && npm run dev
curl -s localhost:3000/api/delegate -H 'content-type: application/json' \
  -d '{"delegation_id":"t1","transcripts":[{"role":"user","text":"nice to meet you, Ada. I run growth at Oxen and we ship weekly"}]}'
curl -s localhost:3000/api/memory/people | jq '.people[0] | {display_name, last_seen, facts}'
# restart next dev → same GET → Ada still there, facts carry source + ts
```
