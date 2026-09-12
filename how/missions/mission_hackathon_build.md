---
type: mission
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [mission, hackathon, build, demo]
---

# Mission — the 6-hour build (KINN, 2026-09-12)

**Objective:** a working 2-minute demo of the wearable social copilot — recognize an
enrolled person, whisper a context card, capture a new fact, recall on re-encounter,
one roast-mode beat.

## Lanes (from PRD v2)

| Hour | Jake (memory) | Luis (agent loop) | Saint (device) | Lisa (product/demo) |
|---|---|---|---|---|
| 1 | ✅ schema + API + seed (pushed) | GPT Live session up | MentraOS bridge start | UI shell |
| 2 | support | glasses↔session **latency gate** | streaming | UI shell |
| 3 | brief/card polish | tool wiring → memory API · packet-injection wire-test | enrollment UX | criteria 1–5 mapping |
| 4 | enrollment data | Exa research agent (async) | latency fallbacks | demo script |
| 5 | failure modes | failure modes | rehearse paths | submission package |
| 6 | **rehearse ×2, freeze** | same | same | runs rehearsal |

## Gates

- **Hour 2:** glasses→GPT Live flaky → fall back to phone mic + audio-only capture (PRD
  failure modes). Decide early, not at hour 5.
- **Hour 3:** verify which append path speaks a hall packet reliably.

## Success

Demo runs twice in rehearsal without touching the network on the critical path; every
inference metered; enrolled-only face recognition (D7).

## AAR (fill at close — SO-9 style)

Worked · Didn't · Finding · Change · Follow-up
