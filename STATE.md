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

- **Memory P0 SHIPPED 12:50** (`what/mmg` main @7513504): `web/src/lib/memory/sqlite.ts` —
  SQLite in-process via `node:sqlite` behind Lisa's five-function seam (D17 accepted), DB at
  `web/data/memory.db` (WAL, gitignored); `index.ts` shim (`MEMORY_BACKEND=json` = old stub);
  `enrich.ts` (`researchQuery` / `absorbResearch`, pure — Lisa's `queue.ts` patch is in
  `memory/HANDOFF.md`); `npm run seed` (5 people, < 1 s) + `npm run memory:check`.
  **Exit gate passed** under `next dev`: Ada banked via `/api/delegate`, facts carry
  `source:live` + ISO `ts`, survives restart, JSON rollback verified.
- **Docs branch `memory-docs-sync` @127c61e (pushed, NOT merged):** every `:7777` /
  `MEMORY_API_URL` line → `@/lib/memory` + `/api/memory/*`; Python sidecar → `memory/legacy/`.
  CLAUDE.md §2: announce in Discord before merging — text in session record.
- Typo fixes landed in Lisa's files (import lines only; listed in HANDOFF): delegate route,
  delegation.ts, supervisor.ts (unescaped backticks broke every route importing it), store.ts.
  `@types/node` ^22. Not touched: `hall/client.ts` imports `ws` (not installed).
- Oxen.ai third pool: base URL fixed; key still not issued. SHIP P1: don't build unless quota dies.
- Graph: `jakejjoyner/MMG.aDNA` (private) + subtree `MMG.aDNA/` in team repo.

## Demo beats (2 min, P0 only — from SHIP/JUDGING)

0:00 browser mic, Start GPT Live · 0:20 "nice to meet you, NAME" → card banks them ·
0:50 a fact lands on card/ledger · 1:10 research returns or honest skip (sourced line) ·
1:40 ONE failure (kill enrichment *or* "no glasses, same agent") · 1:50 ledger close, freeze.

## Session log

- 13:15 closed: [[how/sessions/session_2026-09-12_1300_scope_memory_campaign]] — campaign + architecture scoped, D17–D21 proposed.
- 12:55 closed: [[how/sessions/session_2026-09-12_1245_memory_p0_build]] — M1–M4 built, gate passed, docs branch pushed.

## NEXT (Jake) — campaign `how/campaigns/campaign_memory_p0.md` Phase 2

1. Post the Discord announce (session record) → merge `memory-docs-sync` into main.
2. Hand Lisa `memory/HANDOFF.md`: `callExa → results[]` + the 6-line `run()` patch (name gate).
3. M5: offer the 3-line `patchHealth({memory:"down"})` catch in her delegate route.
4. Hour before freeze: two rehearsals, `docs/SCORING.md` rehearsal log, finish the AAR.

## Consolidation note (2026-09-12)

This graph absorbed `MMGBuild.aDNA` — one graph now holds project + product per operator
direction; both git histories preserved here. The repo keeps its own git under `what/mmg/`.
