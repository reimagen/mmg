---
type: campaign
status: planning
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
owner: jake
tags: [campaign, memory, p0, hackathon]
---

# Campaign — Memory P0: bank the record, hand it over

**Goal.** By freeze, `memory/` on `:7777` speaks the shared contract in `web/src/lib/types.ts`
exactly, so Lisa's delegate route banks a spoken name, Luis's ledger lists it, and Saint's
glasses ingest can reuse the same name path. Deliverable = a running API + a drop-in HTTP
client + a one-page HANDOFF with curl proofs. Functionality first; no auth, local-only bind.

**Contract source of truth:** `web/src/lib/types.ts` (Person/Fact/Interaction, ISO timestamps,
`FactSource = live|enrollment|exa|treg|manual`, `enrolled` flag). Lisa's dispatcher
`web/src/lib/live/tools.ts` sends `upsert_person {display_name, aliases[], face_ref, enrolled,
facts[{text,source,ts}], open_threads[]}` and `log_interaction {person_id, transcript_ref,
extracted_facts[], follow_ups[]}`; expects `recall → Person | miss`, `brief → {brief}`,
and the ledger needs `listPeople()`.

## Phase 0 — precursor (Oxen.ai + mirror rule) — done except the key

| # | Item | Status |
|---|---|---|
| 0.1 | Oxen base URL corrected everywhere (`hub.oxen.ai/api/ai`); env/client/smoke in `how/tools/oxen/`; `oxen.sh` sourced from `.zshrc` | ✅ |
| 0.2 | **Jake: paste key** → `~/.secrets/oxen-api-key` (600) → `bash how/tools/oxen/smoke.sh deepseek-v4-flash` | ⏳ blocked on key |
| 0.3 | Two-way mirror rule in `CLAUDE.md` + `how/tools/mirror.sh` | ✅ |

Oxen is the *third* pool (D16): nothing in P0 depends on it. Precursor only so the fallback
story is real if quota dies.

## Phase 1 — P0 (critical path, in order)

| M | Mission | Deliverable | Check |
|---|---|---|---|
| **M1** | **API speaks `types.ts`** — `/upsert_person` accepts Lisa's payload (aliases, enrolled, facts[], open_threads[]); `/recall` and new `GET /people` return `Person` (ISO ts, `enrolled = face_ref is not null`, `first_met{event,ts}`, `last_seen`); `/log_interaction` returns `Interaction`; fact `source` uses the enum (`live` for transcript facts); WAL + `timeout=5` on connect | `memory/api.py`, `schema.sql` (add `aliases`, keep JSON cols) | `python memory/api.py` self-check + `curl` round-trip |
| **M2** | **Drop-in HTTP client** — `web/src/lib/memory/http.ts` exporting the same five functions as `store.ts` (recall, upsertPerson, logInteraction, brief, listPeople) over `MEMORY_API_URL` (default `http://127.0.0.1:7777`), 1.5 s timeout, returns `null`/`[]` on failure so the live loop never throws | one file; Lisa flips the re-export in `memory/index.ts` | `npm run dev` + delegate → person appears in `/people` |
| **M3** | **Demo cast + reset** — `seed.py` loads 3–5 spoken-name people (face_ref null except one enrolled) with `source: enrollment` facts + one open thread each; `python -m memory.seed` < 10 s | `memory/seed.py` | reseed, `curl /people` shows cast |
| **M4** | **HANDOFF.md** — per-teammate page: Lisa (import flip + env var + payload examples), Luis (`/people` ledger shape, `brief` length rule), Saint (`POST /upsert_person` by spoken name from glasses ingest) with copy-paste curls | `memory/HANDOFF.md` | each curl runs green on a fresh seed |

**Phase 1 exit gate:** from a fresh seed, one curl sequence banks a new person by spoken name
with a fact and a follow-up, and `GET /people` shows them with ISO timestamps and sources.
Then the web app, with the import flipped, shows the same person on the ledger.

## Phase 2 — P1 (only after the gate)

| M | Mission | Why |
|---|---|---|
| M5 | Failure beats: API returns `miss` not 500 on unknown ids; client degrades to `null` when `:7777` is down (loop continues, `LoopHealth.memory = "down"`) | SCORING C3 level 4 |
| M6 | `POST /note` (or `upsert` with `source: exa`) for enrichment write-back; staleness ts on card | slow-plane write-back, HERMES.md step 5 |
| M7 | Rehearsal ×2: fill `docs/SCORING.md` rehearsal log; 5-line AAR in the mission file | freeze rule |

## Out of scope (D13/D15, don't reopen)

Face embeddings / sighting pipeline · auth · vector store · re-encounter demo beat · hall
stand-up. `recall(face_ref)` stays as-is (works, P2).

## Standing rule — two-way mirror

Every touch of MMG.aDNA runs `how/tools/mirror.sh` (pull repo → read doc delta → fold into
CG → push CG → subtree-pull into repo → push). See `CLAUDE.md` §6.

## AAR (fill at freeze)

Worked · Didn't · Finding · Change · Follow-up
