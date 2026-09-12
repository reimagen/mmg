---
type: context
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [context, architecture, memory, enrichment, exa, contract]
---

# Memory + processing layer — architecture (v1, 3-hour build)

**One sentence.** People heard in the realtime loop become durable `Person` records in a
local SQLite file; a processing layer turns heard utterances and Exa research into
short, sourced, ranked facts; the whisper card is composed from those facts, never from
raw transcript. Everything runs in the Next.js process on one laptop, loopback only.

**Borrowed from aDNA:** the triad below (WHAT is stored · HOW it flows · WHO owns which
seam), provenance on every record (`source`, `ts`), append-only log, redaction tiers
(card = shareable, transcript = governed), decisions locked in a table, failure modes as
first-class rows. Nothing else — no vault, no frontmatter on records.

---

## WHAT — the data

### Entities (contract = `web/src/lib/types.ts`, unchanged shapes)

| Entity | Key | Notes |
|---|---|---|
| `Person` | `id` (`person_xxxxxxxx`) | `display_name`, `aliases[]`, `face_ref\|null`, `enrolled`, `first_met{event,ts}`, `facts[]`, `open_threads[]`, `last_seen` |
| `Fact` | (inside Person) | `{text, source, ts}` — **source enum** `live \| enrollment \| exa \| treg \| manual`. Research facts embed the URL in `text` (`"… — exa.ai/…"`), no schema change |
| `Interaction` | `id` (`ix_xxxxxxxx`) | append-only: `ts`, `person_id`, `transcript_ref`, `extracted_facts[]`, `follow_ups[]` |

### Storage — SQLite, in-process, loopback (D17)

```
web/data/memory.db          (gitignored; absolute path resolved from web/)
person(id TEXT PK, name_key TEXT, face_ref TEXT, json TEXT, updated_at TEXT)
interaction(id TEXT PK, person_id TEXT, ts TEXT, json TEXT)
idx: person(name_key), person(face_ref), interaction(person_id, ts)
PRAGMA journal_mode=WAL; busy_timeout=5000; user_version=1
```

`json` holds the whole typed object (the contract is the schema; SQL columns exist only for
lookup). `name_key` = lowercased, diacritics-stripped display name. Engine: Node built-in
`node:sqlite` (`DatabaseSync`, verified Node 26.7). `# ponytail: JSON columns, no
migrations — a demo, not a product.`

### Redaction tiers

| Tier | Content | Where it shows |
|---|---|---|
| shareable | `Person.facts`, `brief` | whisper card, ledger, HUD |
| governed | transcript text | `Interaction.transcript_ref` only (a ref, not the text); never on screen |

---

## HOW — the flows

```
   realtime loop (Lisa)                 memory + processing (Jake)              research (Lisa's HTTP)
   ──────────────────                   ─────────────────────────              ──────────────────────
   "nice to meet you, Ada"  ─► upsertPerson ─► person row ─┐
   turn text ─► logInteraction ─► absorbFacts ─► facts[]   │ enqueue(person)
                                                            ▼
                                            researchQuery(person) ──► callExa(query) ──► raw results
                                                            ▲                                  │
   whisper card ◄── brief(person) ◄── rank(facts) ◄── absorbResearch(person, results) ◄────────┘
```

### F1 · Bank (sync, < 5 ms)
`upsertPerson(input)` — idempotent merge keyed **id → face_ref → name_key**. Merge rules
(Lisa's stub semantics, kept): facts dedupe by lowercased text; open_threads union;
`last_seen = now`; `first_met` set once. Returns the `Person`.

### F2 · Absorb heard facts (sync)
`logInteraction(input)` appends the `Interaction`, then `absorbFacts(person, texts, "live")`:
trim, drop < 12 chars, drop if it contains the person's own name only, cap 180 chars,
dedupe. `follow_ups` → `open_threads`.

### F3 · Research (async, killable — Lisa's queue calls two pure functions of ours)
- `researchQuery(person): string` — never a bare first name. Composes
  `"<display_name>" <top 2 live facts as keywords> <event>`; returns `""` if the person has
  only a first name and no facts (queue skips — an unqueryable person is a *skip*, not a
  bad search).
- `absorbResearch(person_id, results: {title,url,text?,highlights?}[], source): Fact[]` —
  keep a result only if the full `display_name` appears in title or text (name gate);
  one fact per result: `"<title> — <one highlight sentence ≤ 140 chars> — <host/path>"`;
  max **2** research facts per person per run; dedupe by URL; write with
  `source: "exa"` via `upsertPerson({id, facts})`.
- Seam request to Lisa: `callExa` returns raw results (`results[]`), not a joined string,
  and passes `numResults: 5, contents: {highlights: {query}}`.

### F4 · Brief (sync, template, no LLM)
`brief(person_id)` — rank facts: `live` > `enrollment` > `manual` > `exa` > `treg`, newest
first within a tier; take top 2 + first open thread. Two sentences, ≤ 220 chars:
`"<Name> — <fact1>. <fact2 | 'Ask about: thread'>."` Research older than the newest live
fact gets no special mark (KISS); the ledger shows `source` + `ts` so staleness is visible.

### F5 · Ledger + reset
`listPeople()` newest-`last_seen` first. `npm run seed` wipes the DB and loads 5 people
(4 spoken-name, 1 enrolled) in < 10 s.

---

## WHO — seams and ownership

| Seam | Owner | Contract | Change needed |
|---|---|---|---|
| `@/lib/memory` (index.ts) | Jake | five sync functions, same signatures as the stub | swap backend via `MEMORY_BACKEND=sqlite\|json` (default sqlite) |
| `@/lib/memory/enrich.ts` | Jake | `researchQuery`, `absorbResearch` (pure, no I/O) | new file |
| `enrichment/queue.ts` | Lisa | `callExa(query) → results[]`; call our two functions around it | ~6 lines in `run()` |
| `/api/memory/*`, `/api/enrich` | Lisa (exists) | HTTP surface for Saint / Hermes / UI | none |
| `delegation.ts` extraction | Lisa | passes texts to `logInteraction`; our `absorbFacts` cleans | none |
| `docs/*` ":7777" lines | Lisa (Jake edits, announces) | → "`/api/memory/*`, SQLite in-process" | one commit |

---

## Failure modes (rows, not prose)

| Failure | Behaviour | Where |
|---|---|---|
| DB open/write throws | reads return `null`/`[]`; writes rethrow → delegate route already catches → `card: "Memory skipped"` | `sqlite.ts` + Lisa's route |
| Exa timeout / no key | queue marks `skipped`; person keeps live facts | Lisa's `withTimeout` |
| Exa returns wrong person | name gate drops it; zero facts written; job `done` with `result: "no confident match"` | `absorbResearch` |
| Duplicate bank ("Ada" twice) | name_key merge → one row | F1 |
| Unqueryable person (first name only) | `researchQuery` returns `""` → skip | F3 |
| Process restart | WAL file persists; `listPeople` repopulates ledger | storage |

---

## Decisions (this layer)

| # | Decision |
|---|---|
| D17 | SQLite in-process via `node:sqlite` behind Lisa's seam; Python `:7777` retired |
| D18 | Research facts are processed, not dumped: name gate, ≤ 2 per run, URL in text |
| D19 | `brief` is a ranked template, never an LLM call; ≤ 220 chars |
| D20 | Transcript text never persisted — refs only (governed tier) |
| D21 | Loopback only; no auth; phone/glasses reach it over LAN via `NEXT_PUBLIC_MMG_API_URL` (Saint, P2) |

## Verification (exit gate)

```
npm run seed
curl -s localhost:3000/api/delegate -d '{"delegation_id":"t1","transcripts":[{"role":"user","text":"nice to meet you, Ada. I run growth at Oxen and we ship weekly"}]}'
curl -s localhost:3000/api/memory/people | jq '.people[0] | {display_name, facts, last_seen}'
# restart next dev → same query → Ada still there, facts carry source+ts
```
