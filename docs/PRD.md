# PRD — GPT Live MMG (team MMG, "Mac mini gang")
**OpenAI Global Hackathon @ The KINN · Sat 2026-09-12 · 2-minute demo**
**Remaining clock: ~4 hours.** Ranked plan: [`SHIP.md`](./SHIP.md).

Judging bar from the meeting: *exceptional engineering, robust orchestration,
thoughtful failure handling.*

## One-liner
A social copilot **in the conversation**: GPT Live listens (browser mic
guaranteed, Mentra glasses optional), **banks** who you just met, and
**researches** them in the background. The whisper card is the record.

## Scope for the remaining 4 hours

| Ship (P0) | Stretch (P2) |
|---|---|
| Spoken-name enroll + fact log + ledger | Second-pass recognition / re-encounter |
| Killable Exa contact research (Jake) | Face-rec, sightings, glasses HUD |
| Client delegation + in-process SQLite | Auth0, treg, embeddings, Hermes-from-scratch |

Do not reopen: no CopilotKit / TriggerDev / Mozilla; no video into GPT Live;
no stranger camera lookup; no Auth0.

## Decisions already made
- Models: **OpenAI + Oxen.ai**. Live search: **Exa**. Hermes if hall is
  already up (`HERMES_ENABLED=1`); otherwise local Exa queue.
- Demo use case: **banking a new contact during a networking conversation**.
- Repo: **`github.com/reimagen/mmg`**. Team lead: **Greg (Oxen.AI)**.
  - **Jake** — memory (`upsert` / `log` / `brief`) + Exa write-back.
  - **Lisa** — GPT Live + client delegation (Mac). Stay out of Exa while Jake has it.
  - **Saint** — Mentra Live (`client/mentra`, `/glasses`; P2; do not block P0).
  - **Luis** — whisper-card UI, 2-minute script, submission.
- Realtime: `developers.openai.com/api/docs/guides/live`. **Client delegation.**

## Architecture (three loops)
1. **Realtime (P0):** browser mic → GPT Live → whisper card. Glasses additive.
   Camera never reaches Live.
2. **Memory (P0):** spoken name + utterances → `@/lib/memory` SQLite (Jake D17).
   `recall` / `brief` < 150 ms, local, never behind the hall. Rollback:
   `MEMORY_BACKEND=json`. FastAPI `:7777` is retired.
3. **Research (P0 local Exa / P1 Hermes):** Jake owns Exa write-back. Killable;
   timeout + skip; sourced facts upgrade the card. Crash ≠ conversation death.
   [`HERMES.md`](./HERMES.md).

## Memory (Jake)
`person` + `interaction`. Tools: `recall(name)` · `upsert_person` ·
`log_interaction` · `brief`. Heard-name path: `face_ref=null`. Face-ref recall
is P2.

## Orchestration + failure (show one in the video)
- Supervisor: Live ≠ research. Enrichment crash loses research, not the talk.
- External calls: timeout + skip. Never await the network on stage.
- **Rehearse one:** no glasses (browser) *or* kill Exa. Not the full board.
- Token pools: OpenAI for GPT Live. OpenRouter + Oxen are text-only (no `gpt-live-1`). Failover not wired unless quota dies.

## Privacy
No stranger camera lookup. Spoken-name capture is the enroll path. Face-rec
on consenting enrolled people is P2.

## 2-minute script (P0)
See [`JUDGING.md`](./JUDGING.md). Short form:

0. Browser mic — valid environment, not a fallback.
1. Spoken intro → card banks NAME.
2. Talk → a fact lands on the card/ledger.
3. Research returns or skips — sourced line, conversation never waits.
4. Close on the ledger: person, facts, timestamps.

Roast mode is cut. Second encounter: only if P0 is already on tape.

## Open
- ~~Jake: wire `queue.ts` to `absorbResearch`~~ **done** — real Exa via `researchPerson`, query from detected context, corroboration gate, `Fact.url` provenance.
- Lisa: first+last name capture; one proof take.
- Luis: live person + source/ts on `/` (facts now carry `url`; `GET /api/runtime` has health · traces · jobs · the agent's wiki page); projector `/screen.html` is the room TV (not a substitute for Talk).
- Saint: Mentra Live is on hardware (`/glasses`); P0 tape stays on `/`.
- Hermes connect is P1, not a blocker (`ws` is installed).
