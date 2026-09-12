---
type: session
status: closed
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [session, sitrep, memory, campaign, oxen]
---

# Session 2026-09-12 ~11:50–13:15 — graph as offer, Oxen precursor, memory campaign

## SITREP

**Completed**
- Graph pushed as an offer: `jakejjoyner/MMG.aDNA` (private) + subtree `MMG.aDNA/` in
  `reimagen/mmg`; teammate emails/channel id scrubbed from tree; README + 3 one-minute
  templates (AAR, coordination, ADR).
- Base sweep (`.adna/`): nesting the repo in the graph is the documented pattern; teammates
  need zero tooling; only WAL pragmas, reinforcement-count, errors-table and the fail-closed
  ladder are worth borrowing today. Lattice/federation = wrong axis.
- Oxen.ai precursor: base URL corrected to `hub.oxen.ai/api/ai` (graph + repo docs);
  `how/tools/oxen/` (client, smoke, configs); `oxen.sh` sourced from `.zshrc`, OXEN_* only.
- Team delta folded (Lisa 11:58/12:12): lanes re-cut, client delegation, 4-hour SHIP rank,
  D11–D16.
- Standing two-way mirror rule (`CLAUDE.md` §6) + `how/tools/mirror.sh pull|push`.
- Campaign `how/campaigns/campaign_memory_p0.md` rescoped to Lisa's seam; architecture v1
  `what/context/memory_layer_architecture.md` (WHAT/HOW/WHO, F1–F5, failure rows, D17–D21).

**Blockers**
- Oxen API key not yet issued (Jake → `~/.secrets/oxen-api-key`).
- D17–D21 proposed, awaiting Jake's yes before M1 code.

**Files touched (graph):** STATE.md, CLAUDE.md, README.md, .gitignore, who/team.md,
who/coordination/channels.md, what/prd.md, what/decisions/decisions.md,
what/context/context_system_scope.md, what/context/memory_layer_architecture.md,
how/missions/mission_hackathon_build.md, how/campaigns/campaign_memory_p0.md,
how/templates/{aar_lightweight,coordination,adr}, how/tools/{mirror.sh,oxen/*}.
**Repo commits (jjoyner):** eeec6d6, 223f044, 655cf04, b9c2dd3, 6956db0, 5d60feb.

## Next session prompt

`mirror.sh pull` → confirm D17 with Jake → M1 `web/src/lib/memory/sqlite.ts` (node:sqlite,
same five sync exports) → M2 shim → M2b `enrich.ts` → M3 seed → M4 HANDOFF + doc sync
(announce ":7777 → /api/memory/*" in Discord first). Ask Lisa for `callExa` → raw results.
