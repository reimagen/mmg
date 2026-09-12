---
type: state
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [state, mmg, hackathon]
---

# STATE — MMG.aDNA · 2026-09-12 (event day)

## Project state (team)

- Roles locked ([[who/team]]): Jake memory · Luis agent loop · Saint device/MentraOS ·
  Lisa product/demo · Greg lead · Seth/Eric/Teddy floaters.
- Decisions D1–D10 locked ([[what/decisions/decisions]]) — hall adopted (D9), Mentra
  glasses (D8), no CopilotKit (D4).
- PRD v2 posted to team chat; repo access landed; memory v0 + scope pushed to
  `reimagen/mmg` main.

## Product state (build)

- `what/mmg/` @ main: memory system v0 (schema · 4-tool API, self-check passing · seed) +
  PRD + scope doc.
- Scope v0 ([[what/context/context_system_scope]]) carries the GPT-Live wire-up facts
  (Responses-delegation recommendation, no video input, verbatim caveat) and the hall
  integration (two-plane: fast memory sidecar / slow hall rooms).
- Open wire-tests: hour-2 glasses→GPT Live latency gate · hour-3 packet-injection path
  (instructions.append vs commentary).

## NEXT

1. Luis wires GPT Live session tools against the memory API (contract in scope §API).
2. Saint: MentraOS bridge latency check → early fallback if flaky.
3. Enroll 3–5 consenting demo participants; `python -m memory.seed` with the real cast.
4. Hour 6: rehearse the 2-minute demo twice, freeze.

## Consolidation note (2026-09-12)

This graph absorbed `MMGBuild.aDNA` — one graph now holds project + product per operator
direction; both git histories preserved here. The repo keeps its own git under `what/mmg/`.
