# MMG — GPT Live social copilot

Wearable copilot for a networking event. Glasses (MentraOS) stream to **GPT Live**;
the agent whispers a context card (name, how you met, open threads), coaches or
roasts, and remembers people for next time.

Hackathon: OpenAI Global Hackathon @ The KINN · 6-hour build · 2-minute demo.
Team: **Jake** = `memory/` · **Lisa** = GPT Live + Exa · **Saint** = MentraOS · **Luis** = whisper-card UI / demo.

Full brief: [`docs/PRD.md`](./docs/PRD.md) · architecture: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) ·
judging: [`docs/JUDGING.md`](./docs/JUDGING.md) · scoring: [`docs/SCORING.md`](./docs/SCORING.md) · submit: [`docs/SUBMISSION.md`](./docs/SUBMISSION.md)

## Checkout

```bash
git clone https://github.com/reimagen/mmg.git
cd mmg
cp .env.example web/.env.local   # Next.js does not read the repo-root .env
# paste OPENAI_API_KEY, EXA_API_KEY, TREG_TOKEN
cd web && npm install && cd ..
pip install -r memory/requirements.txt
python -m memory.seed && uvicorn memory.api:app --port 7777   # other terminal
npm run dev                      # http://localhost:3000
```

Requires **Node 22+**. Health check: `curl localhost:3000/api/health`

## Lanes (do not collide)

| Person | Owns | Contract |
|---|---|---|
| **Jake** | `memory/**` | FastAPI `recall` / `upsert_person` / `log_interaction` / `brief`. Reads &lt; 150ms. |
| **Lisa** | `web/src/lib/live/**`, `web/src/lib/enrichment/**`, `web/src/app/api/session/**`, `web/src/app/api/delegate/**` | GPT Live WebRTC + **client delegation**, Exa + treg queue. |
| **Saint** | `glasses/**` | MentraOS bridge, sightings, enrollment. Camera ≠ Live video. |
| **Luis** | `web/src/app/**` | Whisper-card UI, demo script, submission. |

Shared types: `web/src/lib/types.ts`. Change those together.

## Three loops (isolated on purpose)

1. **Realtime** — glasses / mic → GPT Live → whisper card. Never await the network on stage.
2. **Memory** — sync read, async write. JSON stub today; SQLite is Jake’s swap.
3. **Enrichment** — Exa (search) + treg (people/company). Killable. Crash ≠ conversation death.

Degraded modes (rehearse): glasses die → phone mic · face miss → “nice to meet you, NAME” · GPT Live quota → OpenRouter + TTS.

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

See [`docs/JUDGING.md`](./docs/JUDGING.md) for the scored run of show.

1. **Browser mic** (glasses optional) → Start GPT Live. Same agent either way.
2. Say “Jake” → card: *met 10 min ago, building the memory system, ask about the schema.*
3. Live talk → new fact lands on the card.
4. Second enrolled guest → instant recall + open thread.
5. Mode: **roast me**.
6. Memory panel: every person, every fact, timestamped.
