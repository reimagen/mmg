---
type: session
status: closed
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [session, context-system, llm-wiki, backend, sitrep]
---

# Session 13:05–13:20 — ingest Lisa, ship the context system

**Directive (Jake 13:12):** system prompt · scaffold + implement the backend and context system ·
wire aDNA in to showcase the LLM-Wiki paradigm · OpenAI key at `~/.secrets/openai-secret-hackathon.key`.

## Ingested (Lisa 529fb6f + 9b70c4c)

Working voice demo on browser mic ("Mac"), `docs/LIVE_LOOP.md` timings, every memory consumer
`await`s (fits sync or async backends), `memory/sidecar.ts` HTTP client → Python `:7777` with
`p0-up.sh` (dormant; `index.ts` untouched = sqlite), duplicate-import fix, `node:sqlite` d.ts stub.
Her errors (13:10 standby) were the duplicate import; resolved by her 13:09 push. **D24 open:** sqlite
vs sidecar default.

## Shipped (main @51d1006)

- `web/src/lib/context/backend.ts` — Responses API tool loop (≤ 4 rounds, 8 s/round, JSON-schema
  answer) over Lisa's `BACKEND_TOOLS` → `runMemoryTool`; regex fallback on any error.
- `web/src/lib/context/prompt.ts` — `KEEPER_RULES` + dynamic packet (index + person page).
- `web/src/lib/memory/wiki.ts` — aDNA projection under `web/data/wiki/`, hooked into every save.
- `delegate/route.ts` — `BACKEND_LLM=1` switch (default OFF). `web/.env.local` created locally.
- Verified under `next dev`: intro turn 4.9 s (upsert + brief), fact turn 5.8 s (log + brief,
  open thread lands as a checkbox on the page), bad model → regex card in 0.5 s. `memory:check`
  green incl. wiki asserts; tsc clean.

## Next session prompt

`mirror.sh pull` → D24 call with Lisa (sqlite vs `:7777`) → rebase/merge or drop `memory-docs-sync`
→ tell Lisa about `BACKEND_LLM=1` + Obsidian on `web/data/wiki/` → M5 health patch offer → M7
rehearsals with the model path ON (watch the ~5 s card latency against LIVE-0002 idle gate).

## 13:25 addendum — D24 resolved, dogfooding on

Jake: "just use the best database for a project of this scale" → SQLite in-process, final.
Retired `sidecar.ts` + `p0-up.sh` to `memory/legacy/`, rebased + merged the docs branch (HERMES
diagram conflict: kept Lisa's new diagram, relabelled memory), `p0-check.sh` → `:3000`, seed now
clears rows in place (found: `rm` of the DB file under a running `next dev` leaves the server on
an unlinked inode). Dev server in tmux `mmg`, `BACKEND_LLM=1`, 5 seeded people + wiki pages.

**Discord announce (Jake posts):**
> Memory is final: SQLite in-process behind `@/lib/memory` (Node's `node:sqlite`, zero deps).
> `:7777` / `MEMORY_API_URL` / `p0-up.sh` are gone — `cd web && npm run seed && npm run dev`, then
> `./scripts/p0-check.sh`. Lisa's `sidecar.ts` is parked in `memory/legacy/`. Opt-in:
> `BACKEND_LLM=1` in `web/.env.local` switches `/api/delegate` to a model-driven backend that
> reads/writes an aDNA wiki of the people it meets (`web/data/wiki/`, open it in Obsidian). Off =
> the regex path you have now. Details + curls: `memory/HANDOFF.md`. Please pull before editing
> README / docs — I touched the `:7777` lines.
