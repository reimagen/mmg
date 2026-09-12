---
type: session
status: closed
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [session, memory, p0, sitrep]
---

# Session 12:45–12:55 — Memory P0 build (M1–M4 + exit gate)

**Opened with:** "continue the current campaign" → D17 accepted. `mirror.sh pull` clean.

## Did

| M | Result |
|---|---|
| M1 | `web/src/lib/memory/sqlite.ts` — `node:sqlite`, WAL + `busy_timeout=5000`, JSON columns, `name_key`/`face_ref` indexes; ranked `brief` (D19); reads never throw; `absorbFacts` (F2, also strips "nice to meet you,") |
| M2 | `index.ts` shim — `MEMORY_BACKEND=json` → stub, else sqlite. Verified both ways under `next dev` |
| M2b | `enrich.ts` — `researchQuery` (bare first name → `""`), `absorbResearch` (name gate, dedupe by URL, ≤ 2/run, URL in text) |
| M3 | `scripts/seed.mjs` (`npm run seed`, 5 people incl. 1 enrolled, Ada deliberately absent) + `scripts/memory-check.mjs` (`npm run memory:check`, 20 asserts, green) |
| M4 | `memory/HANDOFF.md` (Lisa / Luis / Saint, curls, queue patch, exit gate). Docs `:7777` rewrite + Python → `memory/legacy/` on branch **`memory-docs-sync`** (pushed, unmerged — announce first) |

**Exit gate ✅** — seed → `POST /api/delegate` "nice to meet you, Ada…" → `GET /api/memory/people`
shows Ada first with `source:live` + ISO `ts` → restart `next dev` → still there.

Repo: main `7513504` (code + HANDOFF), branch `127c61e` (docs). Graph mirrored.

## Found (not mine, fixed the minimum so the gate could run)

- Lisa's tree did not compile: `supervisor.ts` had unescaped backticks inside a template
  literal (every route importing it 500'd) and `../types`; `delegate/route.ts` and
  `delegation.ts` missing imports; `store.ts` importing a non-existent `./types`. Import-line
  fixes only, listed in HANDOFF.
- `hall/client.ts` imports `ws`, which is not in `package.json` — module-not-found in dev
  logs on every delegate; route still answers. Left alone.
- The queue's stub write-back lands `[exa] exa stub: would search "Ada"` as a `source:exa`
  fact on every delegate — ranks last in `brief`, but visible on the ledger until her patch.
- `@types/node` ^20 has no `node:sqlite` types → bumped to ^22 (devDep only).

## Discord announce (Jake posts; CLAUDE.md §2)

> Memory P0 is in on `main` (7513504): SQLite in-process behind `@/lib/memory` via Node's
> built-in `node:sqlite` — same five functions, zero consumer changes, `MEMORY_BACKEND=json`
> rolls back to the stub. `:7777` / `MEMORY_API_URL` are gone; HTTP surface is the existing
> `/api/memory/*`. `cd web && npm run seed` resets the demo cast. Read `memory/HANDOFF.md`
> (per-person notes + curls). Docs rewrite is on branch `memory-docs-sync` — merging in 10 min
> unless someone objects. Lisa: one ask in HANDOFF — `callExa` → raw `results[]` + a 6-line
> `run()` patch so research facts pass a name gate. Also fixed 4 import typos in your files
> (listed) so the delegate route compiles — please pull before editing `supervisor.ts`.

## Next session prompt

`mirror.sh pull` → confirm the announce went out → merge `memory-docs-sync` → Phase 2: M5
`patchHealth({memory:"down"})` patch offer, M6 stale-vs-fresh `ts` on the card, M7 two
rehearsals + `docs/SCORING.md` log + finish the AAR in the campaign file.
