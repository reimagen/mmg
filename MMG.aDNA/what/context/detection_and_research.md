---
type: context
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [context, detection, research, exa, provenance, runtime]
---

# Detection → processing → research → provenance (13:55)

**One sentence.** What the room says becomes typed signals, signals become banked facts and open
threads, the person's own words become the search that finds them, and every researched line keeps
the link it came from.

## The chain

```
turn text
  │  detect()            heuristics, no model, both backends        → Signal[]
  ├─► signals ──────────────────────────────────────► /api/delegate response (UI shows what was heard)
  ├─► signals ──────────────────────────────────────► model prompt ("bank these")
  ├─► commitments ──────────────────────────────────► open_threads (memory seam)
  └─► company / project ─► researchQuery() ─► Exa ─► name gate ─► Fact{text, url, source:"exa"}
                                                          │
                                                    corroboration required
                                                    for a single-word name
```

| Signal | Caught from | Feeds |
|---|---|---|
| `name` (+ surname) | "nice to meet you, Sam Altman" | the record; a full name is what makes research resolvable |
| `role` | "I'm the CEO at…", "I run growth" | card, query |
| `company` | "at OpenAI", "working on aDNA and ailedger" | **the query**, and the corroboration token |
| `commitment` | "I'll send you an invite" | open thread, automatically |
| `ask` | a question aimed at the operator | prompt context |
| `contact` | email · @handle · URL | the record |
| `correction` | "actually it's spelled…" | prompt context |

## Why the gate is strict (D26)

The first live Exa run on "Jake" banked **Jake Bradley** and **Jake Byrnes** — neither of them the
operator. A substring match on a first name matches every person alive with that first name. The
gate now requires a full name, or a corroborating token the person actually said. The cost is
empty research on a bare first name; the benefit is that a card never asserts a stranger's
biography. An honest skip is a demo beat; a wrong person is a retraction.

## Provenance (D27)

`Fact.url` is set for `exa`/`treg` facts. Research text is stripped of markdown (`#`, `|`, rules)
and dropped entirely when the "highlight" is nav junk rather than a sentence. So a line on a card
is either something heard in the room, or something with a link behind it.

## Presented, not buried (D28)

`GET /api/runtime` is the whole backend in one call: which backend and model, health, counts,
research jobs with their honest notes, the last 12 delegation traces (heard · signals · tools ·
ms), and the focus person's wiki page as markdown. The UI lane consumes it; we don't write UI.

## Verified live

`"nice to meet you, Sam Altman. I am the CEO at OpenAI and I will send you an invite"`

| Layer | Result |
|---|---|
| detect | name=Sam Altman · role=CEO · company=OpenAI · commitment=I will send you an invite |
| memory | live facts "CEO at OpenAI", "promised to send an invite"; open thread "Awaiting the invite" |
| research | 2 sourced facts (wikipedia.org, forbes.com) with URLs |
| card | "Sam Altman — CEO at OpenAI. Promised to send an invite." |

Counter-case, same day: `"Hi I am Jake, working on aDNA and ailedger"` → query `"Jake" aDNA`,
5 results, **none banked** — "none confidently this person — skipped rather than guess".
