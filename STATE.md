---
type: state
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [state, mmg, hackathon]
---

# STATE — MMG.aDNA · 2026-09-12 (event day)

## Project state (team) — re-ranked 12:12 by Lisa (`docs/SHIP.md`, read it before the PRD)

- **~4 h left. Demo = bank the record + contact research, in a live conversation, on a
  browser mic.** Glasses optional (P2). Second-pass recognition / re-encounter / roast / face
  lock are **stretch, not the video** (supersedes PRD v2 demo script and D1's "re-encounter").
- Lanes (README/ARCHITECTURE): Jake = `memory/**` · Lisa = GPT Live client delegation +
  Exa/treg enrichment + hall client · Luis = whisper-card + ledger UI + script + submission
  · Saint = `glasses/**` P2, stay out of P0. Shared types `web/src/lib/types.ts`.
- Scoring tracker (`docs/SCORING.md`): all four criteria **Now 2 / Target 4**. C3 owner =
  Lisa + Jake; blocker to 4 = "delegate + sidecar `:7777` + one killed/skipped Exa".
- Decisions D1–D16 ([[what/decisions/decisions]]); D11–D16 added from the 12:12 re-rank.

## Product state (build)

- `what/mmg/` @ 202caa9: Next.js `web/` (browser operator, GPT Live **client delegation**,
  `runMemoryTool` in `web/src/lib/live/tools.ts`, Exa queue, supervisor, hall client
  `web/src/lib/hall/client.ts` + `POST /api/hall`, `HERMES_ENABLED=0` default) · Jake's
  FastAPI `memory/` (SQLite, 4 tools, seed) · `glasses/` scaffold notes (P2) · docs:
  SHIP / JUDGING / SCORING / SUBMISSION / HERMES / ARCHITECTURE / PRD / scope.
- **Memory integration gap (P0, Lisa's client side):** `web/src/lib/memory/store.ts` is still
  a JSON stub; `grep MEMORY_API_URL web/src` → nothing. SCORING C3 level 3 = "`/api/delegate`
  hits `:7777`, not the stub". Jake's side: make `upsert`/`log`/`brief` real on the
  **spoken-name path** (face_ref null), seed one demo person, WAL + busy_timeout.
- Lisa edited `memory/README.md` (12:12): "P0: upsert/log/brief on spoken name. Face-ref
  recall is P2." — accepted, matches the re-rank.
- Oxen.ai third pool: base URL fixed to `hub.oxen.ai/api/ai` everywhere; env + client +
  smoke test in `how/tools/oxen/`; key not yet issued. SHIP P1: "don't build Oxen unless
  quota is actually dying."
- Graph: `jakejjoyner/MMG.aDNA` (private) + subtree `MMG.aDNA/` in team repo.

## Demo beats (2 min, P0 only — from SHIP/JUDGING)

0:00 browser mic, Start GPT Live · 0:20 "nice to meet you, NAME" → card banks them ·
0:50 a fact lands on card/ledger · 1:10 research returns or honest skip (sourced line) ·
1:40 ONE failure (kill enrichment *or* "no glasses, same agent") · 1:50 ledger close, freeze.

## NEXT (Jake)

1. `upsert_person` / `log_interaction` / `brief` real for the spoken-name path; ledger
   fields the UI needs: facts with `source` (`live|exa|enrollment`) + `ts`.
2. WAL + `timeout=5` on the SQLite connect (enrichment writes concurrently).
3. Seed one demo person; confirm `:7777` answers from `web/` once Lisa lands `MEMORY_API_URL`.
4. Hour before freeze: two rehearsals, fill `docs/SCORING.md` rehearsal log, 5-line AAR
   in the mission file.

## Consolidation note (2026-09-12)

This graph absorbed `MMGBuild.aDNA` — one graph now holds project + product per operator
direction; both git histories preserved here. The repo keeps its own git under `what/mmg/`.
