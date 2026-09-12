# Hermes + hall — slow plane (P1, not the 4-hour blocker)

**Rank:** [`SHIP.md`](./SHIP.md). Contact research **ships on local Exa**.
Flip Hermes on only if hall `:8768` is already running. Do not stand up hall
or `hermes serve` from scratch in the remaining 4 hours.

Hermes is not on the Live path. Memory stays a sidecar. Full contract:
[`chief_of_staff_architecture.md`](./chief_of_staff_architecture.md).

```
GPT Live (client del.)     memory :7777
        │                        ▲ notes (next recall)
        │ send("research", …)    │
        ▼                        │
   hall :8768  ──Dispatch──►  hermes serve
   packets ◄── emit_handoff ──  room:research (Exa)
        │
        ▼  thinking/commentary append  (paraphrase)
   whisper card = verbatim SAY
```

## Why Hermes

Judges want orchestration + failure handling. The hall already has durable
outbox, replay, `consumed` ownership, and fail-closed `emit_handoff`. Hermes
is the process that actually runs `room:research` (Exa/treg) and any later
rooms. Today’s in-process Exa queue is the **same slow plane** with the hall
unplugged.

## Connect checklist (Lisa + whoever has hermes-agent)

1. Run hall on `:8768` (Bearer token). Run `hermes serve` with room sessions.
2. Room titles **must** start with `room:` or `emit_handoff` is gated off.
3. From MMG, fire-and-forget `send(room, text)` — do **not** await the packet
   before Live speaks. Ack = row stored, not “research done.”
4. On `packet`: show `say` on the UI card; `session.commentary.append` may
   paraphrase. Send `consumed` only after the card is on screen.
5. Hermes tools POST notes to Jake’s memory (`upsert` / fact with `source: exa`).
6. If hall/Hermes is down: keep the in-process Exa queue; conversation continues.

## Rooms we will use

| Room | Job |
|---|---|
| `research` | Exa + treg enrichment for a person |
| (later) `cos` | optional briefing — **never** prefetch inside a Live turn (~18 s) |

## Env

```
HALL_WS_URL=ws://127.0.0.1:8768/hall/ws
HALL_TOKEN=
HERMES_ENABLED=0
```

`HERMES_ENABLED=0` (default): queue Exa locally. `1`: `send` to hall; local
queue is the timeout fallback only.

Hall WS auth is a Bearer header — install `ws` in `web/` when connecting
(`cd web && npm i ws`). Native WebSocket cannot set that header.

Seam in this repo: `web/src/lib/hall/client.ts`, `POST /api/hall` (test send or
ingest a packet), `enqueueEnrichment` already tries hall first when enabled.

## Eligibility

Hermes + hall source is a **building block**. The submission is MMG’s live
conversation + memory. Do not resubmit hermes-agent as this project.
