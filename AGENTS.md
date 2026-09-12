# AGENTS.md

Hackathon repo: **MMG** — whisper card for the room you’re in.
Read this before editing. **4 hours left:** [`docs/SHIP.md`](./docs/SHIP.md)
(critical path vs stretch). Longer briefs live in `docs/`.

## Docs map

| Doc | Use when |
|---|---|
| `docs/SHIP.md` | **Start here.** 4-hour rank: P0 bank+research vs P2 second-pass |
| `docs/PRD.md` | Product, lanes |
| `docs/ARCHITECTURE.md` | Three loops, failure modes |
| `docs/context_system_scope.md` | Memory contract (Jake) |
| `docs/HERMES.md` | Hermes slow plane (P1 — only if hall is already up) |
| `docs/chief_of_staff_architecture.md` | Hall / Hermes contracts (reference, not the submission) |
| `docs/JUDGING.md` | 2-minute run of show |
| `docs/SCORING.md` | 1–5 tracker |
| `docs/SUBMISSION.md` | Portal fields + eligibility |

## Lanes — do not collide

| Who | Owns | Do not touch |
|---|---|---|
| **Jake** | `memory/**` | Live session, UI |
| **Lisa** | `web/src/lib/live/**`, `enrichment/**`, `hall/**`, `/api/session`, `/api/delegate` | Memory schema, UI chrome |
| **Luis** | `web/src/app/page.tsx`, `layout.tsx`, `globals.css` | Live protocol, SQLite |
| **Saint** | `glasses/**` (P2) | Memory schema, Live session |

Shared types: `web/src/lib/types.ts`. Change those together.

## Non-negotiables

1. **Client delegation** — GPT Live does not run our tools. Transcripts stay in-app; on `session.delegation.created` hit `POST /api/delegate`; append `session.thinking` / `session.commentary`. Docs: https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
2. **No video into GPT Live.** Camera is P2 sightings only, never a Live track.
3. **Browser mic is the environment.** Glasses optional. Demo must run with `Start GPT Live · browser mic`.
4. **Memory is a sidecar** on `:7777`. `upsert` / `log` / `brief` local only, never behind the hall or Exa. Wire Next to `MEMORY_API_URL` (P0).
5. **Realtime never awaits the network.** Exa/treg: timeout + skip. Crash enrichment ≠ crash conversation.
6. **Privacy:** no stranger camera lookup. Spoken-name capture is the enroll path. Face-rec is P2.
7. **UI card is verbatim ground truth.** Live voice may paraphrase.
8. **Net-new today.** MentraOS / GPT Live / Exa / hall / Hermes *contracts* are building blocks, not the submission.
9. **Ship path is bank + research, not second-pass recognition.** Hermes is P1 (only if hall is already up). `HERMES_ENABLED=0` keeps local Exa. Auth0 is skip.

## Commands

```bash
cp .env.example web/.env.local          # Next does not read repo-root .env
pip install -r memory/requirements.txt
python -m memory.seed && uvicorn memory.api:app --port 7777
cd web && npm install && npm run dev    # :3000
curl localhost:3000/api/health
python memory/api.py                    # self-check
```

Env: `OPENAI_API_KEY`, `EXA_API_KEY` (UUID or `exa_…`), `OPENROUTER_API_KEY`, `OXEN_API_KEY`, `TREG_TOKEN`, `MEMORY_API_URL=http://127.0.0.1:7777`, `HERMES_ENABLED=0`, `HALL_WS_URL`, `HALL_TOKEN`.

## Named orchestration (judges)

**Client delegation + memory sidecar (fast) + killable research queue (slow).**
Hermes/hall is the same slow plane when plugged in — not required for the video.
Token pool: OpenAI → OpenRouter → Oxen (`https://hub.oxen.ai/api/ai`).
