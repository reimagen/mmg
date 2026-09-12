# CLAUDE.md — MMG.aDNA

## What this graph is

**The single context graph for team MMG and its product** — GPT Live MMG, the wearable
social copilot built at the OpenAI Global Hackathon ("Agents, Everywhere"), The KINN,
Venice, 2026-09-12. One graph holds **both the project state** (team, event, decisions,
ops) **and the product state** (context-system spec, reference architecture, and the code
itself) — the same single-graph pattern as the operator's other projects (cf.
`Undiagnosed.aDNA`, `aDNALabs.aDNA`).

Consolidated 2026-09-12 from the earlier `MMG.aDNA` (team ops) + `MMGBuild.aDNA` (build)
pair; both git histories are preserved in this repo.

## Layout (bare triad, aDNA Standard v2.5)

```
what/                       WHAT we know
├── context/event.md            the hackathon: criteria, logistics, link pack
├── context/context_system_scope.md  the product spec — memory system, GPT-Live wire-up,
│                                    hall integration (the Jake↔Luis contract)
├── decisions/decisions.md      D1–D10, locked
├── prd.md                      the PRD (canonical; copies exist in repo + chat)
├── reference/chief_of_staff_architecture_bootoshi.md   Bootoshi's hall (verbatim)
└── mmg/                        ★ THE PRODUCT — reimagen/mmg repo, its own git + remote;
                                 gitignored here (registry pattern: the graph points, the
                                 repo owns the code)
how/                        HOW we work
├── missions/mission_hackathon_build.md   the 6-hour build mission + lanes
├── sessions/                   session records (SITREP close-outs)
└── templates/
who/                        WHO is involved
├── team.md                     roster, roles, handles
├── coordination/channels.md    comms surfaces + ingest feeds
└── governance/governance.md    decision rights (lightweight, hackathon-scale)
```

## Operating rules

1. **Code changes happen in `what/mmg/`** and commit/push on that repo's own remote
   (`reimagen/mmg`). This graph's git never tracks repo contents.
2. **The scope doc is the build contract** — changes to its API table get announced in the
   team Discord, never made silently. Keep `what/mmg/docs/context_system_scope.md` synced
   from `what/context/context_system_scope.md`.
3. **Frontmatter on every triad file** (six base fields); the nested repo is exempt
   (project content layer).
4. **Live feed**: the team Discord group DM auto-ingests every 30 min →
   `operations_jake.aDNA/what/context/comms/` — check it before asking a human.
5. Event-clock bias: terse, paste-ready, smallest thing that demos.

## Startup

`STATE.md` → `what/context/context_system_scope.md` (if building) or
`how/missions/mission_hackathon_build.md` (if orienting) → work.
