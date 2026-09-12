# Context-system scope — GPT Live MMG memory (v0, hackathon build)

The product's core: a **people-memory** the live agent writes mid-conversation
(bank the record) and a killable research loop that adds sourced facts.
This doc is the contract between memory (Jake) and the agent loop (Lisa).
**4-hour rank:** [`SHIP.md`](./SHIP.md). Re-encounter / face-lock is P2.

## Event model (what flows in)

P0 events:

```jsonl
{"type":"utterance", "ts":..., "speaker":"them|me", "text":"...", "person_id":"p_12?"}
{"type":"note",      "ts":..., "person_id":"p_12", "text":"agent-extracted fact"}
```

P2 (do not block ship):

```jsonl
{"type":"sighting",  "ts":..., "face_ref":"enr_03", "confidence":0.92}
```

Unknown face → no lookup. The "nice to meet you, NAME" heard-name path creates
the person (`face_ref=null`).

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

Rule: **the realtime loop never awaits the network.** Research writes back via
`note` events and upgrades the card when ready.

## Flows

1. **Capture (P0):** spoken name → `upsert_person` → utterances → `log_interaction` + `note`.
2. **Brief (P0):** `brief(person_id)` → whisper card + ledger. Template, **no LLM**.
3. **Enrich (P0):** new person → Exa (Hermes `room:research` only if hall is up) → sourced `note`. Never blocks Live.
4. **Re-encounter (P2):** sighting / second pass → open thread. Parked until P0 is green.

## Failure modes (judging criterion — implement, don't just claim)

- Memory API down → agent says so and continues un-augmented (loop never crashes).
- Enrichment agent dead → card shows banked facts; research line skipped.
- Demo reset: `seed.py` in <10 s.
- Face miss / re-encounter: P2. Spoken-name enroll is already P0.

## Hall integration (adopted from Bootoshi's chief-of-staff architecture, 09-12 11:31)

Bootoshi's **hall** (`docs/chief_of_staff_architecture.md` — ~470 lines
Bun/TS + SQLite, extractable) is the bridge between the voice agent and controlling agents.
Composed architecture, two planes:

- **Fast plane (P0):** GPT Live → `upsert` / `log` / `brief` on `:7777` —
  local, <150 ms. Memory is a sidecar, **never behind the hall**.
- **Slow plane (P1 Hermes / P0 local Exa):** If hall `:8768` is already up,
  `send("research", …)` fire-and-forget. Otherwise the in-process Exa queue.
  Do not stand up hall in the remaining hours. [`HERMES.md`](./HERMES.md).
- **Write-back:** research writes `note`s; packets (if any) tell the user;
  notes upgrade the card when ready. `/hall/absorb` is not P0.

Why adopt: §5 of his doc lists "an OpenAI Realtime session (function calling plus
response.create with an exact text)" as a qualifying voice agent — GPT Live wire-up is his
checklist §5 verbatim. And the hall's guarantees (durable outbox, replay, no silent
fallback) *are* the judging criteria's "robust orchestration + thoughtful failure handling."

## GPT-Live wire-up facts (from OpenAI docs, fetched 09-12 ~12:00)

- **Model**: `gpt-live-1`, full-duplex, WebRTC (browser) or WebSocket (server); billed
  **per second** + separate backend charges → open sessions per demo run, never idle.
  Backend models: `gpt-5.6-terra` (quality) / `gpt-5.6-luna` (cost — use for dev).
- **No video input** — glasses camera never reaches GPT Live. Face-rec / sightings are P2.
- **Delegation:** this repo uses **client delegation** (not Responses). Cannot switch mid-session.
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
  low on backend; whisper-card UI is driven **app-side from memory** —
  the <150 ms brief→UI path never waits on the model; the model gets the same card via
  commentary and weaves it into speech on its own clock.

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
