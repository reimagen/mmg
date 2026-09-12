---
type: campaign
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
owner: jake
tags: [campaign, memory, p0, hackathon]
---

# Campaign — Memory P0: SQLite behind Lisa's seam, hand it over

**Rescoped 12:55 after reading Lisa's runtime.** Her architecture: memory is a **module**
(`@/lib/memory`, five **synchronous** functions — `recall`, `upsertPerson`,
`logInteraction`, `brief`, `listPeople`) consumed by 7 call sites (delegation, glasses
ingest, enrichment write-back, 5 `/api/memory/*` routes). Those routes *are* the HTTP
memory API for Saint/Hermes. `store.ts` is a JSON stub whose header says "Jake's lane —
swap for SQLite"; `next.config.ts` already whitelists `better-sqlite3`. An HTTP client to
a Python `:7777` would force `async` through all 7 sites — the opposite of plug-and-play.

**Decision (proposed, D17):** the memory system is **SQLite in-process behind Lisa's seam**,
via Node's built-in `node:sqlite` (verified on Node 26.7: sync `DatabaseSync`, WAL, zero
deps). Same five signatures → zero consumer changes. The Python `memory/` API is retired to
`memory/legacy/` (schema + seed ported); docs' ":7777" lines become "`/api/memory/*`".
One runtime, one contract (`types.ts`), one env var to roll back.

**Best practices folded in (sidecar memory for a realtime agent):** contract-first
(`types.ts` is the API), idempotent upsert keyed by `id` → `face_ref` → normalized name,
ISO-8601 UTC timestamps, provenance on every fact (`source`, `ts`), append-only
interaction log, small tool outputs (card ≤ 2 sentences, facts capped at 5), never-throw
reads (miss → `null`), single-writer SQLite in WAL with `busy_timeout`, absolute DB path
(Next's cwd is `web/`), one env switch for backend, health visible in `LoopHealth.memory`.

## Phase 0 — precursor (done except the key)

| # | Item | Status |
|---|---|---|
| 0.1 | Oxen base URL fixed; env/client/smoke in `how/tools/oxen/`; sourced from `.zshrc` | ✅ |
| 0.2 | **Jake: paste key** → `~/.secrets/oxen-api-key` (600) → `bash how/tools/oxen/smoke.sh deepseek-v4-flash` | ⏳ key |
| 0.3 | Two-way mirror rule (`CLAUDE.md` §6) + `how/tools/mirror.sh` | ✅ |
| 0.4 | `node:sqlite` spike on Node 26.7 — WAL + insert + read OK, no deps | ✅ |

**Architecture:** [[what/context/memory_layer_architecture]] (WHAT/HOW/WHO, failure rows,
D17–D21). Scope narrowed 13:05: Lisa owns Live + Exa HTTP; we own store + processing
(bank · absorb · research query/absorb · brief).

## Phase 1 — P0 (≈2 h, in order)

| M | Mission | Deliverable | Check |
|---|---|---|---|
| **M1** ✅ 12:47 | **`sqlite.ts`** — same five exports as `store.ts`, backed by `node:sqlite` at `web/data/memory.db` (WAL, `busy_timeout=5000`, `user_version=1`). Tables `person(id, json)` + `interaction(id, person_id, ts, json)` — JSON columns, `Person`/`Interaction` stored whole; index on `person_id`. Upsert merge = Lisa's semantics (dedupe facts by lowercased text, union open_threads, `last_seen`). `brief` = her template, capped 2 sentences | `web/src/lib/memory/sqlite.ts` (~120 lines) | `node --experimental-strip-types` self-check: upsert → recall by name → log → brief → listPeople; reopen file → data persists |
| **M2** ✅ | **Shim** — `index.ts` picks backend: `MEMORY_BACKEND=json` → `store.ts`, else `sqlite.ts`. Rollback = one env var, no code | `web/src/lib/memory/index.ts` (5 lines) | `npm run dev`, `curl /api/memory/people` → `{people:[…]}`; flip env → JSON stub again |
| **M2b** ✅ | **`enrich.ts`** — `researchQuery(person)` + `absorbResearch(person_id, results, source)` + `absorbFacts` (pure; F2/F3 rules in the architecture doc). Hand Lisa the 6-line `run()` patch for `queue.ts` | `web/src/lib/memory/enrich.ts` (~80 lines) + patch | self-check: wrong-person result dropped; bare first name → `""`; ≤ 2 facts/run |
| **M3** ✅ | **Seed + reset** — `web/scripts/seed.ts`: 4 spoken-name people (`enrolled:false`, `face_ref:null`) + 1 enrolled, `source:"enrollment"` facts, one open thread each; `npm run seed` wipes + loads < 10 s | `web/scripts/seed.ts`, `package.json` script | reseed, ledger shows cast |
| **M4** ✅ code+HANDOFF on `main` @7513504 · docs on branch `memory-docs-sync` @127c61e, **awaiting Jake's Discord announce → merge** | **HANDOFF.md + doc sync** — `memory/HANDOFF.md`: Lisa (nothing to change; env var; where the DB lives), Luis (`/api/memory/people` ledger shape, `brief` rule), Saint (`POST /api/glasses/ingest` unchanged, `POST /api/memory/upsert` by spoken name) with curls. One commit updates README / ARCHITECTURE / SHIP / SCORING ":7777" → "`/api/memory/*`, SQLite"; Python moved to `memory/legacy/`. **Announce in Discord before merging (CLAUDE.md §2)** | `memory/HANDOFF.md` + doc diff | every curl green on a fresh seed |

**Phase 1 exit gate: ✅ PASSED 12:50** under `next dev` (Ada banked via `/api/delegate`, facts `source:live` + ISO `ts`, survived restart; `MEMORY_BACKEND=json` rollback verified). Definition: fresh seed → `POST /api/delegate` with a "nice to meet you, Ada"
transcript banks Ada with a fact → `GET /api/memory/people` shows her with ISO `ts`,
`source:"live"` → restart `next dev` → she is still there.

## Phase 2 — P1 (only after the gate)

| M | Mission | Why |
|---|---|---|
| M5 | Failure beat: ~~`sqlite.ts` reads catch → `null`/`[]`, writes rethrow~~ (done in M1); `patchHealth({memory:"down"})` on catch in delegate route (Lisa's file — offer as 3-line patch) | SCORING C3 level 4 |
| M6 | Enrichment write-back already lands via `upsertPerson({facts:[{source:"exa"}]})` — verify a stale-vs-fresh `ts` shows on the card | slow plane proof |
| M7 | Rehearsal ×2 → `docs/SCORING.md` log; 5-line AAR below | freeze rule |

## Out of scope (D13/D15/D17)

Python FastAPI as a live service · HTTP client shim · auth · face embeddings · vector store ·
re-encounter beat · hall stand-up · `better-sqlite3` (only if `node:sqlite` misbehaves
under `next dev` — 2-minute fallback, already whitelisted).

## Standing rule — two-way mirror

Every touch of MMG.aDNA: `how/tools/mirror.sh pull` first, `push` last (`CLAUDE.md` §6).

## AAR (fill at freeze)

- **Worked:** `node:sqlite` behind the seam — zero consumer changes, gate green first run under `next dev`.
- **Didn't:** Lisa's tree didn't compile (4 missing imports + unescaped backticks in `supervisor.ts`); nobody had run `npm install` from this checkout.
- **Finding:** the queue's stub write-back lands `[exa] exa stub…` facts with `source:exa` on every delegate — harmless (ranks last) but noisy on the ledger until her `queue.ts` patch.
- **Change:** `absorbFacts` also strips "nice to meet you," (Lisa's extractor leaves it).
- **Follow-up:** Discord announce → merge `memory-docs-sync`; Lisa's `callExa → results[]` patch; M7 rehearsals.
