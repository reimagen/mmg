# BACKEND.md — everything the memory backend does, and how to use it

One page, current state. If you only read one thing, read **Turn it on** and **The one endpoint**.
History and the reasoning behind each choice live in [`memory/HANDOFF.md`](../memory/HANDOFF.md).

## Turn it on

```bash
cd web && npm install
npm run seed          # the real team; --empty for a cold ledger
npm run dev           # :3000
npm run backend:check # 20-second proof the whole loop works, prints what it did
```

`web/.env.local` needs `OPENAI_API_KEY` (voice + backend) and `EXA_API_KEY` (research).
`BACKEND_LLM=1` turns on the model-driven backend. Without it you get the regex path — same
contract, no model.

**Nothing to install for the roster.** `web/roster.json` is committed and loads itself.

## The one endpoint

`GET /api/runtime[?person=<id>]` — everything the backend knows, in one call. Build any status
UI off this and you never need another.

| field | what it gives you |
|---|---|
| `backend` | which path is live (`model` / `regex`), the model name, where the DB is |
| `health` | `LoopHealth` — memory, research, realtime, input, pool |
| `counts` | `{ people, enrolled }` — honest; most people are spoken-name, not face-enrolled |
| `jobs` | the research queue with honest notes ("none confidently this person — skipped") |
| `traces` | last 12 delegations: what was heard, what was detected, which tools ran, how many ms |
| `roster` | the pre-flight homework: 83 people, 79 with real context |
| `page` | the focus person's wiki page as markdown (pass `?person=`) |

## What happens on a turn

```
speech ─► /api/delegate
   │  detect()          name (+surname) · role · company/project · commitment · ask · contact · correction
   ├─► signals ────────────────────────────► in the response, for both backends
   ├─► commitments ────────────────────────► open threads, automatically
   ├─► keeper model ──► recall / upsert_person / log_interaction / brief
   │                    returns { card, say, person_id, org }
   ├─► roster ─────────► warm card on a first encounter, with its source link
   └─► research ───────► Exa on what they actually said → sourced facts with urls
```

Every write also renders `web/data/wiki/who/people/<name>.md` — the LLM-Wiki. Open that folder in
Obsidian; it is the memory, in aDNA form, maintained by the agent.

## Features you might not know are there

| Feature | How to use it |
|---|---|
| **Detection signals** | `POST /api/delegate` returns `signals[]`; each has `kind`, `value`, the `text` span it came from, and a confidence. Show *why* something was banked. |
| **Pre-flight roster** | 83 people from the attendee list + team page. A first name is enough when exactly one person at the event has it: *"nice to meet you, Dhravya"* → Supermemory, Founder. |
| **Import more people** | `POST /api/roster/import` with `{source, teams:[{team,description}]}` or `{source, people:[{name,org,blurb}]}`. Then `npm run roster:export` and commit. |
| **Provenance** | Every researched `Fact` carries `url`. Link it — the whole claim is that lines are sourced. |
| **Name corrections** | Say "actually it's Sam" and the record renames in place, keeping "Stan" as an alias. Needs the `id` on `upsert_person` (it is in the tool schema). |
| **The employer** | `Person.org`, set by the model from any phrasing ("I work at", "my company is", "we're called"). Research searches on it. |
| **Honest skips** | A full name banks on a word-boundary match. A bare first name needs a corroborating token (their employer or project) or it banks **nothing** rather than a stranger's biography. Skips read as “none confidently this person” — a demo beat, not a bug. |
| **Kill research** | `POST /api/enrich {"kill":true}` — the rehearsed failure. Conversation continues. |
| **Research one person** | `POST /api/enrich {"person_id":"person_ab12"}` — query is composed from their context, no need to write one. |
| **Rollback** | `MEMORY_BACKEND=json` → the old JSON stub. Unset `BACKEND_LLM` → the regex path. |

## Model pools (Oxen)

Two pools. OpenAI runs the voice session and, by default, the keeper. **Oxen.ai** (Greg's token
pool, `hub.oxen.ai/api/ai`, OpenAI chat-completions compatible) takes the bulk structured-extraction
work — roster imports and pre-flight research read thousands of characters per person, and that is
where a quota actually goes.

```bash
echo "OXEN_API_KEY=..."  >> web/.env.local     # from ~/.secrets
npm run pool:check                             # probes every configured pool, prints latency
```

`MODEL_POOL` picks the primary: `openai` (default), `oxen`, or `auto` (Oxen first, OpenAI on
failure) — use `auto` when protecting the OpenAI quota for the voice. `OXEN_MODEL` defaults to
`deepseek-v4-flash`. `GET /api/runtime` reports `backend.pools`, and `health.model_pool` names
whichever pool last answered.

**On the pool:** `POST /api/roster/import` and `npm run preflight`.
**Not on the pool:** the live voice session (only OpenAI ships `gpt-live-1`) and the keeper's tool
loop, which stays on OpenAI Responses — its fallback is the regex path, not another model.

## Lanes

| You own | What you need from here |
|---|---|
| **UI** (`web/src/app/**`) | `GET /api/runtime` for a status board; `GET /api/memory/people` for the ledger (newest first, facts carry `source`, `ts`, `url`). Four open findings for `/` are at the end of `memory/HANDOFF.md`. |
| **Live** (`web/src/lib/live/**`) | Nothing to change. `@/lib/memory` is five sync functions behind one import. |
| **Glasses** (`glasses/**`, `client/**`) | `POST /api/glasses/ingest` unchanged; `POST /api/memory/upsert` to enroll by spoken name. LAN reach via `NEXT_PUBLIC_MMG_API_URL`. |

## Scripts

| Command (in `web/`) | Does |
|---|---|
| `npm run seed` | Load the real team. `-- --empty` for a cold ledger. |
| `npm run backend:check` | End-to-end smoke against a running dev server; prints card, signals, tools, roster hit. |
| `npm run memory:check` | Unit self-check of the memory + detection + research logic. No server needed. |
| `npm run preflight` | Research the names in `web/roster-seed.json`. Run **before** the demo, never during. |
| `npm run roster:export` | Refresh `web/roster.json` + the copy in `operations_jake.aDNA/what/context/people/`. |
