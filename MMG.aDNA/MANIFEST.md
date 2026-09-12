---
type: manifest
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [manifest, governance, mmg, hackathon]
---

# MMG.aDNA — Project Manifest

## Project Identity

**MMG** ("Mac mini gang") — hackathon team and its product **GPT Live MMG**: a wearable
social copilot (Mentra Live glasses → GPT Live) that remembers the people you meet,
whispers context cards, and coaches conversations. Built at the OpenAI Global Hackathon,
The KINN, Venice, 2026-09-12.

Single-graph deployment: project state and product state live in one context graph; the
product repo (`github.com/reimagen/mmg`) is nested at `what/mmg/` with its own git.

## Architecture

**aDNA (Agentic DNA)** bare-triad deployment, Standard v2.5, starter conformance.

| Layer | Contains |
|---|---|
| **what/** | event context, product spec (context system), PRD, decisions D1–D10, reference architecture, the product repo |
| **how/** | build mission (6-hour plan + lanes), sessions, templates |
| **who/** | team roster, comms channels, decision rights |

## Entry Points

| Audience | Start | Then |
|---|---|---|
| Agents | `CLAUDE.md` | `STATE.md` → scope doc or mission |
| Humans | `README.md` | `what/prd.md` → `who/team.md` |

## Lineage

Consolidated 2026-09-12 from `MMG.aDNA` (team ops, genesis fea61fe) + `MMGBuild.aDNA`
(build graph, genesis 31308ed) — both histories merged into this repo. Operator: Jake
(memory-system lane); repo owner: Lisa (reimagen).
