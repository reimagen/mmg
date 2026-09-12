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

---

## 13:20 addendum — context system: LLM backend + LLM-Wiki projection (opt-in)

**What:** `BACKEND_LLM=1` in `web/.env.local` switches `POST /api/delegate` from the regex path to
`web/src/lib/context/backend.ts`: a Responses-API tool loop (`BACKEND_MODEL`, default
`gpt-5.4-mini`) over Lisa's `BACKEND_TOOLS` + `runMemoryTool`, same `DelegateResult` contract,
any error/timeout → `handleClientDelegation` (verified: bad model → regex card in 0.5 s).
**Default is OFF** — Lisa's working voice demo is untouched unless the env var is set.

**System prompt:** `web/src/lib/context/prompt.ts` — keeper rules + a dynamic context packet =
the people index + the person-in-focus's wiki page. Page in, page out.

**LLM-Wiki (aDNA form):** every memory write also renders `web/data/wiki/` (gitignored):
`CLAUDE.md` (the keeper's rules), `who/people/<name>.md` (six-field frontmatter, facts with
source+date, open threads as checkboxes, interaction refs), `who/people/index.md`. Open the folder
in Obsidian for the judges — that IS the memory, and the backend model reads the same page it
maintains. `MEMORY_WIKI_DIR` moves it.

Measured: ~5 s per delegate turn on the model path (2 tool rounds) vs ~0.9 s regex. Browser gates
commentary on output-idle already, so the card just lands later. Lever if needed: fewer rounds
(`reasoning.effort`), or keep regex for the intro turn and model for fact turns.

Seen in Lisa's `extractFacts` (not touched): stripping the name with a bare regex turns
"robotics" into "rotics" for a person named Bo — use `\b${name}\b`.

---

## 13:55 addendum — detection, real Exa research, and a runtime API for the UI

**Nothing in `web/src/app/**` changed — that's Luis's lane.** Everything below is the backend
plus one new read-only route to consume.

### `GET /api/runtime[?person=<id>]` — the backend, presentable

```json
{ "backend": { "kind": "model|regex", "model": "gpt-5.4-mini", "store": "SQLite · node:sqlite · web/data/memory.db", "wiki_dir": "…", "mode": "coach" },
  "health": { … LoopHealth … },
  "counts": { "people": 6, "enrolled": 1 },
  "jobs":   [ { "id": "job_…", "status": "done|skipped|failed", "source": "exa", "result": "2 sourced fact(s) from 5 results" } ],
  "traces": [ { "ts": "…", "heard": "…", "signals": [ … ], "tools": ["upsert_person → person_ab12", "brief"], "card": "…", "ms": 5400, "backend": "model" } ],
  "page":   "---\ntype: person\n… the markdown wiki page of the focus person …" }
```

Everything needed to show what the system is doing: which backend, which tools ran this turn,
how long, what was detected, the research queue, and the page the agent maintains. `traces` is the
last 12 delegations, newest first. `page` is null unless `?person=` is passed.

### Detection — `POST /api/delegate` now returns `signals`

Every delegation carries `signals: Signal[]` (`web/src/lib/types.ts`), backend-independent:

| kind | example value | use |
|---|---|---|
| `name` | `Sam Altman` | surname captured when spoken — it's what makes research work |
| `role` | `CEO` | card + research query |
| `company` | `OpenAI`, `aDNA` | also from "working on X and Y" |
| `commitment` | `I will send you an invite` | becomes an open thread automatically |
| `ask` | `What do you build?` | a question aimed at the operator |
| `contact` | `ada@oxen.ai`, `@handle` | |
| `correction` | `actually it's spelled…` | |

Each signal carries `value`, the `text` span it came from, and a confidence, so the UI can show
*why* something was banked.

### Research actually runs now (Exa key is in `web/.env.local`)

`researchPerson()` in `web/src/lib/memory/enrich.ts` owns the loop: detected context → query →
Exa → name gate → structured facts. `queue.ts` `run()` calls it (that's the patch this file asked
for; the `[exa] exa stub…` fact is gone). **`Fact` gained an optional `url`** — a researched line
can be traced to its source, so a card can link out instead of asserting.

**The gate is deliberately strict.** A single-word name banks nothing unless a result also
contains something the person actually said (their company or project). Searching "Jake" returns
every Jake alive; a wrong-person fact on a whisper card is worse than an empty one. Full names
stand on their own. Honest skips read like `5 results, none confidently this person — skipped
rather than guess` in `jobs[].result`.

Live trace, one turn: *"nice to meet you, Sam Altman. I am the CEO at OpenAI and I will send you
an invite"* → live facts `CEO at OpenAI` + `promised to send an invite` · open thread
`Awaiting the invite` · exa facts from wikipedia.org and forbes.com with URLs · card
`Sam Altman — CEO at OpenAI. Promised to send an invite.`

### `POST /api/enrich` — `query` is now optional

Pass `{ "person_id": "person_ab12" }` and the query is composed from that person's detected
context. Handy for a "research this person" button that doesn't need to know the query language.

### III pass — findings in the UI I did NOT fix (Luis's lane)

Reviewed `page.tsx` before the lane call; reverted my edits. Four findings worth a look:

1. **`Recall Jake` recalls whoever is newest**, not Jake — the label is hardcoded, the handler uses
   `cardPerson ?? people[0]`. On a seeded demo it recalls Maya Chen.
2. **`memory · N enrolled`** counts everyone; almost nobody is enrolled (`enrolled` means a face
   ref). `counts` in `/api/runtime` gives both numbers honestly.
3. **Fact provenance is invisible** — the ledger prints `facts[0].text` with no `source`, no `ts`,
   no link, and the whole claim of the product is that lines are sourced. `Fact.url` is there now.
4. **`LoopHealth` renders nowhere** — the rehearsed failure beat (kill research) has no on-screen
   proof, which is the C3 scoring line. `/api/runtime` returns health + jobs for a status strip.

Also pre-existing, not mine: `page.tsx:44` fails lint (`setState` synchronously inside an effect),
and `/api/health` polls every 2 s even when the tab is hidden.

---

## 14:10 addendum — misheard names, and the one line I changed in `browser.ts`

**Symptom (Jake):** "I say Sam at OpenAI and it always thinks I am saying Stan."

**Upstream (Lisa's file, one line — please keep or tell me to revert).** `getUserMedia({ audio: true })`
let Chrome run its own automatic gain control on top of a laptop mic that already carries +20 dB of
hardware boost, so consonants pump and smear. `browser.ts` now uses a `MIC` constraint object:
echo cancellation **on** (Mac's voice leaves the same laptop when the demo is on speakers), noise
suppression **on** (loud room), **auto gain control off**, mono, 48 kHz. Nothing else about the
session changed. A headset mic still beats any constraint we can set.

Two levers I did **not** touch because they are yours: the Live session has no input-audio
transcription config, so there is nowhere to bias the recognizer toward the names in the room. If
the API exposes a transcription prompt or vocabulary hint, feeding it the `display_name`s already
in memory is the highest-leverage fix left for this.

**Downstream (my lane, shipped).** A correction now sticks and never forks the record:

- `upsertPerson` with an existing `id` and a new `display_name` moves the old spelling into
  `aliases`. Say "actually it's Sam" and the record renames; "Stan" still recalls him.
- `detect()` reads corrections — "actually it's Sam", "I said Sam", and spelled-out names
  ("S-A-M") — and hands them to the model as a signal.
- The keeper prompt now states the rule: correct in place with the same `person_id`, never bank a
  second person, and a spelling the person gives always beats the transcript.

**On the projector screenshot:** `web/public/screen.html` is a bundled design export with no
`fetch` in it — "MEMORY DOWN", "Memory API unreachable" and "MEMORY EMPTY" are static copy, not
live readings. Memory was up with six people the whole time. To make that board real it needs
`GET /api/runtime` (backend · health · jobs · last 12 traces · the focus person's wiki page) and
`GET /api/memory/people`. Also note `health.memory` has no writer since the Python sidecar was
retired: it sits at its default `"ok"` forever, so do not trust it as a liveness signal — a failed
`/api/memory/people` call is the honest check.
