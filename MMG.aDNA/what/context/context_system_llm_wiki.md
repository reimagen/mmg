---
type: context
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [context, memory, llm-wiki, adna, backend, prompt]
---

# Context system — LLM-Wiki paradigm, wired (13:20)

**One sentence.** Mac's memory is a wiki the agent maintains: one aDNA `who/` page per person,
read before speaking and rewritten after every turn — SQLite is the store, the wiki is what the
model sees and what the judges see.

## The loop (page in → tools → page out)

```
transcript ──► POST /api/delegate (BACKEND_LLM=1)
                 │ instructions = KEEPER_RULES + who/people/index.md + <person in focus>.md
                 ▼
            gpt-5.4-mini  ──tools──► recall / upsert_person / log_interaction / brief   (Lisa's BACKEND_TOOLS → runMemoryTool → @/lib/memory)
                 │                          │ every save() → sqlite row + who/people/<name>.md + index.md
                 ▼                          ▼
     { card, say, person_id }        web/data/wiki/  (aDNA form; open in Obsidian for the showcase)
```

| Piece | File (repo) | Note |
|---|---|---|
| System prompt | `web/src/lib/context/prompt.ts` | `KEEPER_RULES` (static) + `buildInstructions(lastPersonId)` (dynamic packet) |
| Backend | `web/src/lib/context/backend.ts` | Responses API, JSON-schema answer, ≤ 4 tool rounds, 8 s/round, regex fallback |
| Wiki projection | `web/src/lib/memory/wiki.ts` | `renderPersonPage`, `writePersonPage`, `writeIndex`; seeds the keeper `CLAUDE.md` |
| Switch | `web/src/app/api/delegate/route.ts` | `BACKEND_LLM=1` → `runBackend`, else `handleClientDelegation` |
| Env | `web/.env.local` (gitignored) | `OPENAI_API_KEY` (from `~/.secrets/openai-secret-hackathon.key`), `BACKEND_LLM=1`, `BACKEND_MODEL` |

## Measured (13:17, next dev, seeded)

| Turn | Model path | Tools called | Result |
|---|---|---|---|
| "nice to meet you, Ada. I run growth at Oxen and we ship weekly" | 4.9 s | upsert_person, brief | card "Ada — Runs growth at Oxen. Ships weekly." |
| "we are hiring two engineers next month, remind me to send her the job post" (focus=Ada) | 5.8 s | log_interaction (fact + follow-up), brief | page gains a fact + an open thread checkbox |
| same intro with `BACKEND_MODEL=does-not-exist` | 0.5 s | — | regex fallback card; `[backend] model path failed → regex fallback` logged |

Regex path is ~0.9 s. The browser already gates spoken commentary on output-idle (LIVE-0002), so
the slower card simply lands later. Levers: `reasoning.effort`, or regex for intro turns + model
for fact turns.

## Why it showcases aDNA

The vault the judges open (`web/data/wiki/`) has the triad's shape and frontmatter — `CLAUDE.md`
persona + rules, `who/people/*.md` with six base fields, an index with `[[wikilinks]]` — and it is
written by the agent, not by us. The same markdown is the model's context packet, so "the agent
reads and maintains its own wiki" is literally true, not a slide.

## Known noise

- Lisa's queue stub writes `[exa] exa stub: would search "Ada"` as a `source:exa` fact on every
  delegate → shows on the page. Her `queue.ts` patch (HANDOFF) removes it.
- Her `extractFacts` name-strip turns "robotics" → "rotics" for "Bo" (bare regex, needs `\b`).
