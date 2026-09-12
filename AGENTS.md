# AGENTS.md

Hackathon repo: **MMG** — whisper card for the room you’re in. The live agent is **Mac** (Talk / Hang up).
Read this before editing. Status + directives: [`docs/SHIP.md`](./docs/SHIP.md).
Scoring target is **5 on all four** ([`docs/SCORING.md`](./docs/SCORING.md)).

## Docs map

| Doc | Use when |
|---|---|
| `docs/SHIP.md` | **Start here.** Team directives + P0/P1/P2 status. Target 20. |
| `docs/SCORING.md` | 1–5 bars, Now=11, path to each 5, win script |
| `docs/JUDGING.md` | 2-minute spoken run of show |
| `docs/PRD.md` | Product, lanes |
| `docs/ARCHITECTURE.md` | Three loops, failure modes |
| `docs/context_system_scope.md` | Memory contract (Jake) |
| `docs/LIVE_LOOP.md` | Measured GPT Live client-delegation loop (LIVE-0002) |
| `docs/HERMES.md` | Hermes ripcord (leave off; pull if time is short) |
| `docs/chief_of_staff_architecture.md` | Hall / Hermes contracts (reference, not the submission) |
| `docs/SUBMISSION.md` | Portal fields + eligibility |

## Lanes — do not collide

| Who | Owns | Do not touch |
|---|---|---|
| **Jake** | `memory/**`, `web/src/lib/memory/**` (store · detection · research), `web/src/lib/context/**`, `/api/runtime` | Live session, UI |
| **Lisa** | `web/src/lib/live/**`, `hall/**`, `/api/session`, `/api/delegate` | Memory schema, Exa queue, UI chrome, Mentra relay |
| **Luis** | `web/src/app/page.tsx`, `layout.tsx`, `globals.css` | Live protocol, SQLite |
| **Saint** | `client/mentra/**`, `client/browser/**`, `/glasses` | Memory schema. Do not require glasses for P0. |

Shared types: `web/src/lib/types.ts`. Change those together.

## Non-negotiables

1. **Client delegation** — GPT Live does not run our tools. Transcripts stay in-app; on `session.delegation.created` hit `POST /api/delegate`; append `session.thinking` / `session.commentary`. Docs: https://developers.openai.com/api/docs/guides/live-delegation?delegation-mode=client
2. **No video into GPT Live.** Camera is P2 sightings only, never a Live track.
3. **Browser mic is the P0 environment.** Glasses optional (`/glasses`). Demo must run with **Talk** on `/`.
4. **Memory is in-process SQLite** behind `@/lib/memory` (Jake D17). `upsert` / `log` / `brief` local only, never behind the hall or Exa. Rollback: `MEMORY_BACKEND=json`. FastAPI `:7777` is retired. HTTP for glasses/Hermes: `/api/memory/*`.
5. **Realtime never awaits the network.** Exa/treg: timeout + skip. Crash enrichment ≠ crash conversation.
6. **Privacy:** no stranger camera lookup. Spoken-name capture is the enroll path. Face-rec is P2.
7. **UI card is verbatim ground truth.** Live voice may paraphrase.
8. **Net-new today.** MentraOS / GPT Live / Exa / hall / Hermes *contracts* are building blocks, not the submission.
9. **Ship path is bank + research + a 20s spoken-name re-encounter.** Hermes is a time ripcord (`HERMES_ENABLED=0`; pull it if the clock is tight). Auth0 is skip. Roast is cut. OpenRouter dropped (no `gpt-live-1`).

## Commands

```bash
cp .env.example web/.env.local          # Next does not read repo-root .env
cd web && npm install && npm run seed && npm run dev    # :3000
curl localhost:3000/api/health
```

Env: `OPENAI_API_KEY`, `EXA_API_KEY` (UUID or `exa_…`), `OXEN_API_KEY`, `TREG_TOKEN`, `MEMORY_BACKEND` (unset = SQLite; `json` = stub), `HERMES_ENABLED=0`, `HALL_WS_URL`, `HALL_TOKEN`.

## Named orchestration (judges)

**Client delegation + local memory (fast) + killable research queue (slow).**
Hermes/hall is a time ripcord — not required for the video. Default `HERMES_ENABLED=0` (local Exa).
Token pool: **OpenAI GPT Live only.** OpenRouter dropped 2026-09-12 (`openai/gpt-live-1` 404; no Live/Realtime in catalog). Oxen has no `gpt-live-1` either.
