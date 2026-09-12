# Architecture — three isolated loops

Judging: exceptional engineering, robust orchestration, thoughtful failure handling.
**4-hour rank:** [`SHIP.md`](./SHIP.md). Camera / face-rec / Hermes-from-scratch are P2/P1.

```
 browser panel (judges)          glasses (optional, P2)
        │                                │
        └──────── mic audio ─────────────┤
                                         │ camera → sightings only if time
                     │
                     ▼
              ┌──────────────┐
              │ GPT Live     │  FAST PLANE  WebRTC audio
              │ client del.  │  no tools on the live model
              └──────┬───────┘
                     │ session.delegation.created
                     ▼
              ┌──────────────┐
              │ @/lib/memory │  Jake · SQLite in-process (node:sqlite)
              │ web/data/*.db│  upsert / log / brief   NEVER behind hall
              └──────┬───────┘
                     │ thinking.append + commentary.append
                     │ (paraphrase — UI card is ground truth)
                     ▼
              ┌──────────────┐
              │ research     │  SLOW PLANE  killable
              │ Exa queue    │  query from detected context; name gate;
              │              │  facts carry their source url; timeout+skip
              │ Hermes opt.  │  P1: hall :8768 if already up
              └──────────────┘
```

Named orchestration: **client delegation + memory sidecar + killable research queue**.
Hermes: [`HERMES.md`](./HERMES.md). Hall contract (reference):
[`chief_of_staff_architecture.md`](./chief_of_staff_architecture.md).

## Supervisor

Realtime is supervised separately from research. Failed `/api/delegate` skips
the card; conversation continues. Every external call gets **timeout + skip**.
Demo never awaits the network on stage.

## Degraded modes (rehearse **one**)

| Failure | Fallback | Pri |
|---|---|---|
| No glasses | Browser mic | P0 (default path) |
| Enrichment crash / timeout | Conversation continues; last banked card stays | P0 to show once |
| Memory down | Un-augmented talk | P1 |
| GPT Live quota | Key present (OpenRouter); no Live on that API. Skip unless quota dies. | P1, not wired |
| Face-rec miss | Spoken-name enroll | P2 (enroll is already P0) |

Token pools: **OpenAI for GPT Live.** OpenRouter + Oxen are text-only (neither has `gpt-live-1`). Failover is not wired.

## Privacy

No stranger camera lookup. Spoken-name capture is the enroll path.

## Team lanes

| Person | Owns | Do not touch |
|---|---|---|
| **Jake** | `memory/**` | Live session, UI |
| **Lisa** | `web/src/lib/live/**`, `enrichment/**`, `hall/**` | Memory schema, UI chrome |
| **Saint** | `glasses/**` (P2) | Memory schema, Live session |
| **Luis** | `web/src/app/page.tsx` | Live protocol, SQLite |

Shared: Jake's Memory API + `web/src/lib/types.ts`.
