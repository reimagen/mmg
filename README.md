# MMG — GPT Live social copilot

Social copilot for a live conversation. GPT Live listens (browser mic
guaranteed, glasses optional), **banks** who you just met, and **researches**
them in the background. Whisper card is the record.

Hackathon: OpenAI Global Hackathon @ The KINN · 2-minute demo.
**4 hours left — ranked plan:** [`docs/SHIP.md`](./docs/SHIP.md).

Team: **Jake** = `memory/` · **Lisa** = GPT Live + Exa · **Saint** = MentraOS (P2) · **Luis** = UI / demo.

Agents: [`AGENTS.md`](./AGENTS.md) (Cursor / Claude). Rules: `.cursor/rules/`.

Full brief: [`docs/SHIP.md`](./docs/SHIP.md) · [`docs/PRD.md`](./docs/PRD.md) · architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) ·
judging: [`docs/JUDGING.md`](./docs/JUDGING.md) · scoring: [`docs/SCORING.md`](./docs/SCORING.md) · submit: [`docs/SUBMISSION.md`](./docs/SUBMISSION.md)

## Checkout

```bash
git clone https://github.com/reimagen/mmg.git
cd mmg
cp .env.example web/.env.local   # Next.js does not read the repo-root .env
# paste OPENAI_API_KEY, EXA_API_KEY, TREG_TOKEN
cd web && npm install && cd ..
(cd web && npm run seed)         # demo cast → web/data/memory.db (SQLite, in-process)
npm run dev                      # http://localhost:3000
```

Requires **Node 22+**. Health check: `curl localhost:3000/api/health`

## Local P0 boot

```bash
cd web && npm run seed && npm run dev   # SQLite in-process: web/data/memory.db (+ web/data/wiki/)
./scripts/p0-check.sh                   # /api/health + /api/memory/people + /api/session on :3000
```

Memory is `@/lib/memory` (SQLite via `node:sqlite`, no sidecar, no `:7777`). `BACKEND_LLM=1` in
`web/.env.local` turns on the model-driven delegation backend + the LLM-Wiki at `web/data/wiki/`
(`memory/HANDOFF.md`).

Browser mic is the P0 environment. See [`docs/SHIP.md`](./docs/SHIP.md).

## Lanes (do not collide)

| Person | Owns | Contract |
|---|---|---|
| **Jake** | `web/src/lib/memory/**`, `memory/` | SQLite in-process (`node:sqlite`) behind `@/lib/memory`: `upsert_person` / `log_interaction` / `brief` / `recall` by name. HTTP: `/api/memory/*`. Reads &lt; 150ms. |
| **Lisa** | `web/src/lib/live/**`, `enrichment/**`, `hall/**`, `/api/session`, `/api/delegate` | GPT Live + **client delegation**, Exa queue. Hermes only if hall is already up. |
| **Saint** | `glasses/**` | **P2.** MentraOS. Camera ≠ Live video. Do not block P0. |
| **Luis** | `web/src/app/**` | Whisper-card + ledger, demo script, submission. |

Shared types: `web/src/lib/types.ts`. Change those together.

## Three loops (isolated on purpose)

1. **Realtime** — mic → GPT Live → whisper card. Never await the network on stage.
2. **Memory** — bank the person (`upsert` / `log` / `brief`). SQLite in-process behind `@/lib/memory` (`memory/HANDOFF.md`). `MEMORY_BACKEND=json` = the old stub, not the ship path.
3. **Research** — Exa (P0). Hermes `room:research` only if hall is already up (P1). Killable. Crash ≠ conversation death.

Degraded modes (rehearse **one**): no glasses → browser mic · Exa timeout → skip. Face-rec and second-pass are P2. Auth0 is skip.

## Keys

| Var | Where | Shape |
|---|---|---|
| `OPENAI_API_KEY` | GPT Live | OpenAI secret |
| `OPENROUTER_API_KEY` | fallback pool | OpenRouter secret |
| `OXEN_API_KEY` | third pool | `https://hub.oxen.ai/api/ai` |
| `EXA_API_KEY` | search | `exa_…` from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) |
| `TREG_TOKEN` | people/company enrich | [treg.to](https://treg.to/llms.txt) |

Exa MCP (for the coding agent, not the live loop): `https://mcp.exa.ai/mcp` with header `x-api-key`. Canonical: https://docs.exa.ai/reference/exa-mcp

## Glasses

See [`glasses/README.md`](./glasses/README.md). MentraOS miniapp is on-device (`bunx create-mentra-miniapp`). If streaming is flaky in hour 2, freeze the browser-mic path and keep going.

## Demo script (2 min)

See [`docs/JUDGING.md`](./docs/JUDGING.md). Ranked: [`docs/SHIP.md`](./docs/SHIP.md).

1. **Browser mic** → Start GPT Live.
2. Spoken intro → card **banks** NAME.
3. Talk → a fact lands on the ledger.
4. Research returns or skips — sourced line, conversation never waits.
5. Ledger close: person, facts, timestamps.

Second-pass recognition and roast are stretch.
