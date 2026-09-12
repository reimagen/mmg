# Hermes + hall — ripcord (not the tape)

**Rank:** [`SHIP.md`](./SHIP.md). Contact research **ships on local Exa**.

**Ripcord:** leave `HERMES_ENABLED=0`. If time is short, **pull it** — do not
connect hall `:8768`, do not run `hermes serve`, do not debug packets. The
code can stay. C3=5 is killable local Exa + a visible skip, not Hermes live.

Flip Hermes on only if hall is already running **and** P0 (first+last, ledger,
tape) is already in the can.

Hermes is not on the Live path. Memory stays a sidecar. Full contract:
[`chief_of_staff_architecture.md`](./chief_of_staff_architecture.md).
Measured loop: [`LIVE_LOOP.md`](./LIVE_LOOP.md) (delegation ~0.9 s, Hermes ~17 s).

```
GPT Live (client del.)     memory (in-proc SQLite)
        │ thinking.append now
        │ send("research") P1
        ▼
   hall :8768  ──►  hermes serve  (~17 s)
   packet say  ──►  wait output-transcript idle
        │
        ▼  commentary.append (verbatim instruction)
   whisper card = ground truth
```

Local Exa is the **fast lane (1–3 s)** with the same append gate. That is the ship path.

## Why Hermes

Judges want orchestration + failure handling. The hall already has durable
outbox, replay, `consumed` ownership, and fail-closed `emit_handoff`. Hermes
runs `room:research`. Local Exa is that lane with the hall unplugged.

## Connect checklist (P1 — hall already up)

1. Hall `:8768` + `hermes serve` on the **emit_handoff** build (stale daemon = no packet).
2. Room titles **must** start with `room:`. MMG uses `research`. **Never `cos`.**
3. `send(room, text)` fire-and-forget. Ack ~20 ms = row stored, not “research done.”
4. On `packet`: paint `say` on the UI card. `commentary.append` only after
   **output-transcript idle** (appending during the bridge sentence is swallowed).
   Instruction: read results word for word. `consumed` after the card is on screen.
5. Hermes tools POST notes to Jake’s memory (`source: exa`).
6. Hall down → local Exa. Conversation continues.

## Rooms we will use

| Room | Job |
|---|---|
| `research` | Exa + treg enrichment for a person |
| `cos` | **Do not use** in the demo (~18 s briefing; durable history) |

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
