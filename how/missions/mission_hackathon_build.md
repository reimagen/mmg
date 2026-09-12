---
type: mission
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [mission, hackathon, build, demo]
---

# Mission — the 6-hour build (KINN, 2026-09-12)

**Objective (re-ranked 12:12, `docs/SHIP.md`):** a 2-minute video, browser mic, live
conversation — hear a name → bank the person + facts on the ledger → research them in the
background → whisper card shows the record; one rehearsed failure beat. Re-encounter and
roast are stretch (D13).

## Lanes — remaining ~4 h (SHIP.md; supersedes the PRD v2 table below)

| Who | P0 only | Stop doing |
|---|---|---|
| **Jake** | `upsert`/`log`/`brief` real on spoken name; seed one demo person; `:7777` answers | face embeddings, sighting pipeline |
| **Lisa** | Live E2E, delegate → bank, client → `:7777` via `MEMORY_API_URL`, Exa fact on card | hall extraction, second-pass prompts, Auth0 |
| **Luis** | card + ledger for *this* conversation; script + submit | second-guest UI, chatbox, polish |
| **Saint** | stay out of P0; glasses only if already working | face lock as a demo beat |

## Lanes (from PRD v2 — historical)

| Hour | Jake (memory) | Luis (agent loop) | Saint (device) | Lisa (product/demo) |
|---|---|---|---|---|
| 1 | ✅ schema + API + seed (pushed) | GPT Live session up | MentraOS bridge start | UI shell |
| 2 | support | glasses↔session **latency gate** | streaming | UI shell |
| 3 | brief/card polish | tool wiring → memory API · packet-injection wire-test | enrollment UX | criteria 1–5 mapping |
| 4 | enrollment data | Exa research agent (async) | latency fallbacks | demo script |
| 5 | failure modes | failure modes | rehearse paths | submission package |
| 6 | **rehearse ×2, freeze** | same | same | runs rehearsal |

## Gates

- ~~Hour 2: glasses→GPT Live latency~~ — resolved by D12: browser mic is the environment.
- ~~Hour 3: hall packet append path~~ — deferred with D14 (Hermes P1, off by default).
- **Now:** web client hits `:7777` (not the JSON stub) — SCORING C3 level 3.
- **Freeze:** after rehearsal take 2 if both takes ≥4 on every criterion.

## Success

Demo runs twice in rehearsal without touching the network on the critical path; every
inference metered; enrolled-only face recognition (D7).

## AAR (fill at close — SO-9 style)

Worked · Didn't · Finding · Change · Follow-up
