# PRD — GPT Live MMG (team MMG, "Mac mini gang")
**OpenAI Global Hackathon @ The KINN · Sat 2026-09-12 · 6-hour build · 2-minute demo**
Source: team meeting 10:52–11:15 PDT (Plaud note, processed 11:25). Judging criteria from the
meeting: *exceptional engineering, robust orchestration, thoughtful failure handling.*

## One-liner
A wearable social copilot: **Mentra Live** smart glasses (MentraOS) stream to **GPT Live**; the agent recognizes who
you're talking to, whispers a context card (name, how you met, open threads), coaches the
conversation in real time — with **coach** and **roast-me** modes — and remembers everyone
for next time.

## Decisions already made (don't reopen)
- Models: **OpenAI + OpenRouter**. Live search/validation: **Exa**.
- **No CopilotKit / TriggerDev / Mozilla** — complexity without payoff for 6 hours.
- Demo use case: **navigating a networking event**.
- Repo: **`github.com/reimagen/mmg`**. Team lead: **Greg (Oxen.AI)**. Roles:
  - **Jake** — persistent memory system (schema, API, recall/brief).
  - **Lisa** — GPT Live session + agent loop: client delegation, tool wiring to Memory API, research agents (Exa).
  - **Saint (Bootoshi)** — glasses/device layer: MentraOS bridge (start from
    `SmartGlassesChatGPT`), camera/mic streaming, enrollment UX, latency check.
  - **Luis** — whisper-card browser UI, criteria 1–5 mapping, 2-minute
    demo script + submission package.
  - Seth · Eric · Teddy — floaters: demo data enrollment, testing, GPU/backup rig (Teddy).
- Glasses stack: **Mentra Live / MentraOS** — start from
  `github.com/Mentra-Community/SmartGlassesChatGPT` + `docs.mentraglass.com`.
- Realtime API: `developers.openai.com/api/docs/guides/live`.

## Architecture (three loops, isolated on purpose)
1. **Realtime loop (latency-critical):** glasses **mic** → GPT Live session → whisper-card UI
   (browser panel). Only this loop touches the demo's critical path.
   **Camera never reaches GPT Live** (no video input on `gpt-live-1`). Face-rec stays in
   Saint's device layer and emits `sighting {face_ref}` events into memory.
2. **Memory loop (Jake):** sighting/utterance events → Memory API (`memory/` FastAPI :7777) →
   SQLite. Synchronous reads (`recall` / `brief` < 150 ms), async writes. Memory is a
   sidecar — **never behind the hall**.
3. **Enrichment loop (async, killable):** research agents (Exa, treg) enrich profiles in
   the background; results upgrade cards on *next* recall — never block the live loop.
   Target shape is Bootoshi's **hall** (slow plane: `send`/`stop`, 5-field packets). Until
   the hall is extracted, Exa runs in a killable queue with timeout + skip.

**Chosen Live mode (this repo):** GPT Live **client delegation** — we keep transcripts,
handle `session.delegation.created`, run memory ourselves, append
`session.thinking` / `session.commentary`. Cannot switch to Responses mid-session.
See `docs/context_system_scope.md` + `docs/chief_of_staff_architecture.md`.

## Memory system (Jake's lane)
**Schema** — two tables, that's all:
- `person`: `id · display_name · aliases[] · face_ref (embedding/enrollment id) ·
  first_met {event, ts} · facts[] {text, source, ts} · open_threads[] · last_seen`
- `interaction`: `ts · person_id · transcript_ref · extracted_facts[] · follow_ups[]`

**API** (the agent's tools): `recall(face_ref | name)` → card · `upsert_person(...)` ·
`log_interaction(...)` · `brief(person_id)` → 2-sentence whisper.
SQLite + a JSON facts column; embeddings only if time remains. `# ponytail: SQLite now,
vector store never (for a demo)`.

## Orchestration + failure handling (the judging criteria — address explicitly)
- Supervisor pattern: realtime loop supervised separately from enrichment agents (queue in,
  queue out); an agent crash loses enrichment, never the conversation.
- **Every external call** (Exa, OpenRouter, socials) gets timeout + budget + fallback:
  cached result → skip gracefully. Demo never awaits the network on stage.
- **Degraded modes, rehearsed:** glasses die → phone mic, audio-only name capture; face-rec
  misses → name-spoken fallback ("nice to meet you, NAME" triggers enrollment); GPT Live
  quota → OpenRouter text loop with TTS.
- Token pools: OpenAI primary; **OpenRouter fallback; Oxen.ai as third pool** (OpenAI-
  compatible: base_url `https://hub.oxen.ai/api/ai`, `Bearer $OXEN_API_KEY`).

## Privacy guardrail (one line, saves the demo)
Face recognition on **enrolled, consenting demo participants only** (pre-enroll 3–5 people);
strangers get audio-name capture, no camera lookup. Judges notice this — in a good way.

## 2-minute demo script
0. **If glasses are missing, stay on the browser.** That is a valid environment
   (voice + this panel), not a failure. Same agent.
1. Teammate approaches (glasses or across the laptop) → card whispers: *"Jake — met 10 min ago, building the
   memory system, ask about the schema."*
2. Live conversation → agent extracts a new fact → card updates on screen.
3. Second encounter with an enrolled guest → instant recall with open thread.
4. Mode switch: **roast me** → one laugh beat.
5. Close on the memory panel: every person, every fact, timestamped — "it remembers so you
   don't have to."

Portal fields, eligibility split, and social draft: [`SUBMISSION.md`](./SUBMISSION.md).

## 6-hour plan
| Hour | Jake | Lisa |
|---|---|---|
| 1 | repo scaffold + memory schema + API stub | GPT Live session up (browser mic) |
| 2 | recall/upsert/log working (SQLite) | client delegation + Memory API tools |
| 3 | whisper-card brief generation | transcript → `/api/delegate` wiring |
| 4 | enrollment flow + demo data | Exa research agent (async queue) |
| 5 | failure modes + degraded paths | OpenRouter / Oxen fallback |
| 6 | **rehearse the 2-min demo twice, then freeze** | same |

Parallel lanes: **Saint** = hours 1–3 glasses→stream bridge, 4–5 enrollment + latency
fallbacks · **Luis** = hours 1–2 UI shell, 3–4 criteria mapping + script, 5–6 submission
package + runs the rehearsals.

## Open (from the meeting's own gap list)
- Orchestration story to *name* for judges (answer: **client delegation + memory sidecar
  (fast) + hall/Exa queue (slow)**). Hall packets are paraphrased by GPT Live; the UI card
  is the verbatim ground truth.
- Glasses→GPT Live streaming reliability — validate in hour 2, fall back early if flaky.
  Audio only into Live; camera is sightings, not a video track.
