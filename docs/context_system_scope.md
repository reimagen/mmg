# Context-system scope — GPT Live MMG memory (v0, hackathon build)

The product's core: a **per-user people-memory** the live agent reads and writes
mid-conversation. This doc is the contract between the memory system (Jake) and the agent
loop (Lisa). Smallest thing that demos; ceilings marked.

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

## Hall integration (adopted from Bootoshi's chief-of-staff architecture, 09-12 11:31)

Bootoshi's **hall** (`docs/chief_of_staff_architecture.md` — ~470 lines
Bun/TS + SQLite, extractable) is the bridge between the voice agent and controlling agents.
Composed architecture, two planes:

- **Fast plane (this doc, unchanged):** GPT Live calls `recall`/`brief` directly —
  synchronous, local, <150 ms. Memory is a sidecar tool, **never behind the hall**.
- **Slow plane (the hall):** GPT Live registers `send(room, text)` + `stop(room)`, holds
  one WS to hall `:8768`; async agents live in rooms (`room:research` = the Exa enrichment
  loop from §Flows) and reply as **5-field packets** (`state·say·did·need·next`) spoken
  verbatim in silence. Durable both ways; replay on reconnect; consumed-ack ownership;
  fail-closed `emit_handoff` enforcement.
- **Write-back:** room agents call this memory API server-side (`note` events) — packets
  tell the user, notes upgrade the next recall. `/hall/absorb` and `log_interaction` are
  siblings, not duplicates: absorb feeds the room's context, log feeds the person graph.

Why adopt: §5 of his doc lists "an OpenAI Realtime session (function calling plus
response.create with an exact text)" as a qualifying voice agent — GPT Live wire-up is his
checklist §5 verbatim. And the hall's guarantees (durable outbox, replay, no silent
fallback) *are* the judging criteria's "robust orchestration + thoughtful failure handling."

## GPT-Live wire-up facts (from OpenAI docs, fetched 09-12 ~12:00)

- **Model**: `gpt-live-1`, full-duplex, WebRTC (browser) or WebSocket (server); billed
  **per second** + separate backend charges → open sessions per demo run, never idle.
  Backend models: `gpt-5.6-terra` (quality) / `gpt-5.6-luna` (cost — use for dev).
- **No video input** — glasses camera never reaches GPT Live. Face-rec runs in Saint's
  device layer emitting `sighting` events (this scope already assumed that; confirmed).
- **Two delegation modes, pick one per session** (can't switch mid-session):
  1. **Responses delegation (recommended for 6h)**: declare our tools on the *backend*
     model in session config (`delegation.responses.tools` — recall/upsert/log/brief +
     hall send/stop); OpenAI runs the loop; our app just executes function bodies and
     replies `function_call_output` + `response.create` to continue. Least code for Lisa.
  2. **Client delegation**: we receive `session.delegation.created` (metadata only — task
     text must be assembled from `session.input_transcript.delta`) and run our own loop;
     results back via `session.commentary.append` (≤500 tokens/append).
- **⚠ Verbatim caveat (amends the hall contract §2.3.1)**: GPT Live has **no
  speak-this-exact-string primitive** — `commentary.append` text is *"trained to
  paraphrase."* Hall packets' SAY will be near-verbatim at best (prompt with "say
  verbatim:" discipline). Accepted for the hackathon; the UI shows the exact SAY text as
  ground truth while the voice paraphrases.
- **Hall packet injection**: packets arriving outside any delegation go in via
  `session.instructions.append` (`delegation_id: null`) or commentary — **verify which
  speaks reliably in hour 3**; ack ≠ spoken (the docs warn appends don't prove playback,
  which matches the hall's consume-after-audio rule — consume on our side only after the
  card is on screen).
- Latency: speculative prep off transcript deltas; concise tool outputs; `reasoning.effort`
  low on backend; whisper-card UI is driven **app-side from sighting events directly** —
  the <150 ms recall→UI path never waits on the model; the model gets the same card via
  its tool result and weaves it into speech on its own clock.

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
