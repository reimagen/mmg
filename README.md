# MMG — GPT Live social copilot

Social copilot for a live conversation. GPT Live listens (browser mic
guaranteed, glasses optional), **banks** who you just met, and **researches**
them in the background. Whisper card is the record.

Hackathon: OpenAI Global Hackathon @ The KINN · 2-minute demo.
**Ranked plan + directives:** [`docs/SHIP.md`](./docs/SHIP.md) (target **5/5/5/5**). Live E2E is up (**Talk** / **Hang up**). Memory is Jake SQLite. First+last, live ledger, and tape still open.

Team: **Jake** = memory + Exa write-back · **Lisa** = GPT Live / Mac · **Saint** = MentraOS (P2) · **Luis** = UI / demo.

Agents: [`AGENTS.md`](./AGENTS.md) (Cursor / Claude). Rules: `.cursor/rules/`.

Full brief: [`docs/SHIP.md`](./docs/SHIP.md) · [`docs/PRD.md`](./docs/PRD.md) · architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) ·
judging: [`docs/JUDGING.md`](./docs/JUDGING.md) · scoring: [`docs/SCORING.md`](./docs/SCORING.md) · submit: [`docs/SUBMISSION.md`](./docs/SUBMISSION.md)

## Checkout

```bash
git clone https://github.com/reimagen/mmg.git
cd mmg
cp .env.example web/.env.local   # Next.js does not read the repo-root .env
# paste OPENAI_API_KEY, EXA_API_KEY, TREG_TOKEN
cd web && npm install && npm run seed && npm run dev   # http://localhost:3000
```

Requires **Node 22+**. Health check: `curl localhost:3000/api/health`

## Local P0 boot

```bash
cd web && npm run seed && npm run dev   # SQLite: web/data/memory.db
curl localhost:3000/api/health
```

Memory is `@/lib/memory` (SQLite via `node:sqlite`, no sidecar, no `:7777`). `BACKEND_LLM=1` in
`web/.env.local` turns on the model-driven delegation backend + the LLM-Wiki at `web/data/wiki/`
(`memory/HANDOFF.md`).

Browser mic is the P0 environment. See [`docs/SHIP.md`](./docs/SHIP.md).

## Lanes (do not collide)

| Person | Owns | Contract |
|---|---|---|
| **Jake** | `web/src/lib/memory/**`, `memory/`, Exa write-back | SQLite in-process behind `@/lib/memory`. HTTP: `/api/memory/*`. |
| **Lisa** | `web/src/lib/live/**`, `hall/**`, `/api/session`, `/api/delegate` | GPT Live **client delegation**. Stay out of Exa and Mentra relay. |
| **Saint** | `client/mentra/**`, `/glasses` | Mentra Live on hardware. `client/browser` is the fallback. P0 tape is `/`. |
| **Luis** | `web/src/app/**`, `web/public/screen.html` | Whisper-card + ledger on `/`. Projector is `/screen.html`. Demo script, submission. |

Shared types: `web/src/lib/types.ts`. Change those together.

## Three loops (isolated on purpose)

1. **Realtime** — mic → GPT Live → whisper card. Never await the network on stage.
2. **Memory** — bank the person (`upsert` / `log` / `brief`) via `@/lib/memory` SQLite (P0). JSON stub is rollback only (`MEMORY_BACKEND=json`).
3. **Research** — Exa (Jake). Hermes `room:research` only if hall is already up (P1). Killable. Crash ≠ conversation death.

Degraded modes (rehearse **one**): no glasses → browser mic · Exa timeout → skip. Face-rec and second-pass are P2. Auth0 is skip.

## Keys

| Var | Where | Shape |
|---|---|---|
| `OPENAI_API_KEY` | GPT Live | OpenAI secret |
| `OXEN_API_KEY` | unused for Live | no `gpt-live-1`; not a Mac fallback |
| `EXA_API_KEY` | search | `exa_…` from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) |
| `TREG_TOKEN` | people/company enrich | [treg.to](https://treg.to/llms.txt) |

Exa MCP (for the coding agent, not the live loop): `https://mcp.exa.ai/mcp` with header `x-api-key`. Canonical: https://docs.exa.ai/reference/exa-mcp

## Glasses

See [`client/mentra/README.md`](./client/mentra/README.md). Page: `/glasses`. If it flakes on stage, use `/` (browser mic).

## Demo script (2 min)

See [`docs/JUDGING.md`](./docs/JUDGING.md). Ranked: [`docs/SHIP.md`](./docs/SHIP.md).

1. **Browser mic** → **Talk**.
2. Spoken intro → card **banks** NAME.
3. Talk → a fact lands on the ledger.
4. Research returns or skips — sourced line, conversation never waits.
5. Ledger close: person, facts, timestamps.

Second-pass recognition is stretch. Roast mode is cut.
