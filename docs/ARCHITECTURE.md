# Architecture — three isolated loops

Judging criteria: exceptional engineering, robust orchestration, thoughtful failure handling.

```
 glasses (MentraOS)          browser panel (judges)
        │                            │
        ├─ mic ── audio ─────────────┤
        └─ camera → sighting events ─┘  (never a Live video track)
                     │
                     ▼
              ┌──────────────┐
              │ GPT Live     │  FAST PLANE  WebRTC audio
              │ client del.  │  no tools on the live model
              └──────┬───────┘
                     │ session.delegation.created
                     ▼
              ┌──────────────┐
              │ memory/      │  Jake FastAPI :7777  recall/brief <150ms
              │ sidecar      │  NEVER behind the hall
              └──────┬───────┘
                     │ thinking.append + commentary.append
                     │ (paraphrase, not verbatim — UI card is ground truth)
                     ▼
              ┌──────────────┐
              │ hall / Exa   │  SLOW PLANE  killable
              │ send/stop    │  5-field packets when hall lands
              └──────────────┘
```

Named orchestration for judges: **client delegation + memory sidecar + hall/Exa slow plane**.
Hall contract: `docs/chief_of_staff_architecture.md`. GPT Live caveat: no speak-this-exact-string;
consume packets only after the whisper card is on screen.

## Supervisor

Realtime loop is supervised separately from enrichment. A failed `/api/delegate`
skips the card and the conversation continues. Every external call
(Exa, treg, OpenRouter, socials) gets **timeout + budget + fallback**:
cached result → skip gracefully. Demo never awaits the network on stage.

## Degraded modes (rehearse these)

| Failure | Fallback |
|---|---|
| Glasses die | Phone / laptop mic, audio-only name capture |
| Face-rec miss | Spoken-name enrollment (`nice to meet you, NAME`) |
| GPT Live quota | OpenRouter text loop + TTS |
| Enrichment crash | Conversation continues; card stays on last recall |

Token pools: **OpenAI → OpenRouter → Oxen.ai** (`https://hub.oxen.ai/api/ai`).

## Privacy

Face recognition on **enrolled, consenting demo participants only** (pre-enroll 3–5 people).
Strangers get audio-name capture, no camera lookup.

## Team lanes

| Person | Owns | Do not touch without a ping |
|---|---|---|
| **Jake** | `memory/**`, `docs/context_system_scope.md` | Live session, glasses, UI |
| **Lisa** | `web/src/lib/live/**`, `web/src/lib/enrichment/**` | Memory schema |
| **Saint** | `glasses/**`, MentraOS / sightings | Memory schema, Live session config |
| **Luis** | `web/src/app/**` whisper-card UI, demo script | Memory schema |

Shared contracts: Jake's Memory API + `web/src/lib/types.ts`.
