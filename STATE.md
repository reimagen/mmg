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
- **Detection + research shipped 13:55 (main @6bb1b7d, D25–D28):** every turn yields `Signal[]` (name+surname · role · company/project · commitment · ask · contact · correction) that feed open threads, the model prompt, and the Exa query; `researchPerson` runs the real Exa call with a **corroboration gate** (a bare first name banks nothing — the first live run returned two unrelated Jakes); `Fact.url` carries provenance; `GET /api/runtime` exposes backend/health/jobs/traces/wiki page for the UI lane — [[what/context/detection_and_research]]. Exa key loaded from `~/.secrets/exa-secret-hackathon.key`.
- **Lane call (Jake 13:50): we do NOT own the UI.** `page.tsx` edits reverted; four III findings handed to Luis in `memory/HANDOFF.md` (the "Recall Jake" button recalls the newest person · "N enrolled" counts everyone · fact provenance invisible · `LoopHealth` rendered nowhere). Pre-existing lint error at `page.tsx:44` left alone.
- **Context system shipped 13:20 (main @51d1006, D22/D23):** `BACKEND_LLM=1` → `context/backend.ts` model tool loop (gpt-5.4-mini, ~5 s/turn, regex fallback verified) with `context/prompt.ts` keeper prompt; every memory write mirrors to `web/data/wiki/` as aDNA `who/people/*.md` + index + `CLAUDE.md` — [[what/context/context_system_llm_wiki]]. Key at `~/.secrets/openai-secret-hackathon.key` → `web/.env.local`.
- **Lisa 13:06/13:09 (529fb6f, 9b70c4c):** working browser-mic voice demo (Mac persona, Talk/Hang up, `docs/LIVE_LOOP.md`), all memory consumers now `await`; added `memory/sidecar.ts` HTTP client → Python `:7777` + `scripts/p0-up.sh` (dormant — `index.ts` still = sqlite, D24 open); fixed the duplicate import; stubbed `node:sqlite` types.
- **13:25 D24 resolved → docs merged (main @e76c271, seed fix @7fb5166):** no `:7777` anywhere outside `memory/legacy/`; `scripts/p0-check.sh` probes `:3000`; `npm run seed` clears rows in place (safe under a running dev). Dogfood server: tmux `mmg`.
- ~~Docs branch `memory-docs-sync`~~ merged + deleted: every `:7777` /
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
- 13:20 closed: [[how/sessions/session_2026-09-12_1310_context_system]] — Lisa's push ingested; LLM backend + LLM-Wiki shipped (D22–D24).

## NEXT (Jake) — campaign `how/campaigns/campaign_memory_p0.md` Phase 2

0. ~~D24~~ resolved: SQLite. Docs merged. **DOGFOOD NOW:** `tmux attach -t mmg` (next dev on :3000, `BACKEND_LLM=1`) → http://localhost:3000 → Talk → bank real people; pages appear in `web/data/wiki/who/people/`.
0b. Tell the team: `BACKEND_LLM=1` + the Exa key are in `web/.env.local`; `GET /api/runtime` is the one call for showing the backend; four UI findings are in `memory/HANDOFF.md` for Luis.
1. Post the Discord announce (below) — the `:7777` retirement is merged; CLAUDE.md §2 wants the team told.
2. Hand Lisa `memory/HANDOFF.md`: `callExa → results[]` + the 6-line `run()` patch (name gate).
3. M5: offer the 3-line `patchHealth({memory:"down"})` catch in her delegate route.
4. Hour before freeze: two rehearsals, `docs/SCORING.md` rehearsal log, finish the AAR.

## Consolidation note (2026-09-12)

This graph absorbed `MMGBuild.aDNA` — one graph now holds project + product per operator
direction; both git histories preserved here. The repo keeps its own git under `what/mmg/`.
