---
type: prd
status: active
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [prd, mmg, gpt_live, hackathon]
---

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
  - **Luis** — GPT Live session + agent loop: tool wiring to Memory API, research agents (Exa).
  - **Saint (Bootoshi)** — glasses/device layer: MentraOS bridge (start from
    `SmartGlassesChatGPT`), camera/mic streaming, enrollment UX, latency check.
  - **Lisa** — product + demo: whisper-card browser UI, criteria 1–5 mapping, 2-minute
    demo script + submission package (repo/Drive/doc are already hers).
  - Seth · Eric · Teddy — floaters: demo data enrollment, testing, GPU/backup rig (Teddy).
- Glasses stack: **Mentra Live / MentraOS** — start from
  `github.com/Mentra-Community/SmartGlassesChatGPT` + `docs.mentraglass.com`.
- Realtime API: `developers.openai.com/api/docs/guides/live`.

## Architecture (three loops, isolated on purpose)
1. **Realtime loop (latency-critical):** glasses A/V → GPT Live session → whisper-card UI
   (browser panel). Only this loop touches the demo's critical path.
2. **Memory loop (Jake):** utterance/face events → Memory API → SQLite. Synchronous reads
   (`recall` < 150 ms), async writes.
3. **Enrichment loop (async, killable):** research agents (Exa, socials) enrich profiles in
   the background; results upgrade cards on *next* recall — never block the live loop.

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
1. Teammate approaches wearing the Mentra glasses → card whispers: *"Jake — met 10 min ago, building the
   memory system, ask about the schema."*
2. Live conversation → agent extracts a new fact → card updates on screen.
3. Second encounter with an enrolled guest → instant recall with open thread.
4. Mode switch: **roast me** → one laugh beat.
5. Close on the memory panel: every person, every fact, timestamped — "it remembers so you
   don't have to."

## 6-hour plan
| Hour | Jake | Luis |
|---|---|---|
| 1 | repo scaffold + memory schema + API stub | GPT Live session up, mic/cam streaming |
| 2 | recall/upsert/log working (SQLite) | glasses → session bridge, latency check |
| 3 | whisper-card brief generation | tool-call wiring: agent ↔ Memory API |
| 4 | enrollment flow + demo data | Exa research agent (async queue) |
| 5 | failure modes + degraded paths | UI panel polish |
| 6 | **rehearse the 2-min demo twice, then freeze** | same |

Parallel lanes: **Saint** = hours 1–3 glasses→stream bridge, 4–5 enrollment + latency
fallbacks · **Lisa** = hours 1–2 UI shell, 3–4 criteria mapping + script, 5–6 submission
package + runs the rehearsals.

## Open (from the meeting's own gap list)
- Orchestration story to *name* for judges (answer: the supervisor + queue pattern above).
- Glasses→GPT Live streaming reliability — validate in hour 2, fall back early if flaky.
