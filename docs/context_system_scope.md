# Context-system scope — GPT Live MMG memory (v0, hackathon build)

The product's core: a **per-user people-memory** the live agent reads and writes
mid-conversation. This doc is the contract between the memory system (Jake) and the agent
loop (Luis). Smallest thing that demos; ceilings marked.

## Event model (what flows in)

The realtime loop emits three event types to memory; everything else is derived:

```jsonl
{"type":"sighting",  "ts":..., "face_ref":"enr_03", "confidence":0.92}
{"type":"utterance", "ts":..., "speaker":"them|me", "text":"...", "person_id":"p_12?"}
{"type":"note",      "ts":..., "person_id":"p_12", "text":"agent-extracted fact"}
```

`face_ref` comes only from the **enrollment set** (consenting demo participants — D7).
Unknown face → no lookup; the "nice to meet you, NAME" heard-name path creates the person.

## Schema (SQLite, two tables + one view)

```sql
person(id, display_name, aliases_json, face_ref, first_met_event, first_met_ts,
       facts_json,          -- [{text, source: utterance_id|exa|manual, ts}]
       open_threads_json, last_seen_ts)
interaction(id, ts, person_id, transcript_ref, extracted_facts_json, follow_ups_json)
-- view: card(person_id) -> latest brief inputs (name, first_met, top facts, open threads)
```

`-- ponytail: JSON columns over normalized tables; embeddings only if hours remain.`

## API (the agent's tools — FastAPI, four routes)

| Tool | Contract | Budget |
|---|---|---|
| `recall(face_ref \| name)` | → card `{person_id, display_name, brief, facts[], open_threads[]}` or `{unknown:true}` | **<150 ms**, local only |
| `upsert_person(...)` | create/merge; heard-name path sets `face_ref=null` | async ok |
| `log_interaction(...)` | append; extraction happens agent-side | async ok |
| `brief(person_id)` | 2-sentence whisper text (template over card view — **no LLM call**) | <150 ms |

Rule: **the realtime loop never awaits the network.** LLM/Exa enrichment writes back via
`note` events and upgrades the *next* recall.

## Flows

1. **Recall**: sighting → `recall(face_ref)` → whisper card to UI ≤1 s after face lock.
2. **Capture**: utterance stream → agent extracts facts → `log_interaction` + `note`.
3. **Enrich (async, killable)**: new person → Exa/socials agent → `note` events, sourced.
4. **Re-encounter**: sighting → card now includes open threads → "ask about X" prompt.

## Failure modes (judging criterion — implement, don't just claim)

- Memory API down → agent says so and continues un-augmented (loop never crashes).
- Face miss → heard-name fallback (flow 2 path).
- Enrichment agent dead → cards serve stale data silently (staleness ts on card).
- Demo reset: `seed.py` reloads the enrolled cast + canned facts in <10 s.

## aDNA patterns borrowed (don't reinvent)

- **Entity-per-person with provenance** — every fact carries `source` + `ts` (the vault
  frontmatter discipline, minimized to two JSON fields).
- **Redaction tiers** — card/brief = shareable tier; raw transcript = governed tier. The
  demo screen shows cards, never raw transcript of non-consenting speakers.
- **Append-only interaction log** — the operator's-log pattern; replayable.

## Post-hackathon seam (noted, not built)

Per-user memory graphs are structurally mini context graphs — if this becomes a product,
each user's store maps onto an aDNA-style vault (person entities + interaction log) and the
enrichment agents onto ingest pipelines. Zero code today; the schema above doesn't fight it.
