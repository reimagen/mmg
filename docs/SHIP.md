# 4-hour ship — status 2026-09-12 14:02 PDT

**Team board.** Pull this before you code. Scoring 5-bars: [`SCORING.md`](./SCORING.md).
2-minute script: [`JUDGING.md`](./JUDGING.md).

**Target: 5 on all four (20).** Now is **11**. 4 is a miss.
**Demo:** bank the record + contact research + a 20s re-encounter, in a live conversation.
**P0 environment:** browser mic on `/`. Live agent is **Mac** (**Talk** / **Hang up**).
**Glasses / projector:** additive. Do not require `/glasses` or `/screen.html` for the tape.

## What ships

Hear a name → **bank** person + facts → **research** in the background → whisper card
is the record → walk off and **come back**, Mac still has them. Conversation never
waits on the network.

## Rank + status

| Pri | Item | Status | Owner | Do not |
|---|---|---|---|---|
| **P0** | Browser mic → **Talk** → Mac hears/speaks | **Done.** ICE hang fixed; Hang up cuts billing. Voice: `marin`. Gen Z prompt shipped. | Lisa | Typed chat |
| **P0** | Spoken name → card banks **first + last** | **Split.** Jake `detect` captures `Sam Altman`. Lisa’s Live INTRO still enrolls one token into `display_name`. Wire enroll to the name signal. | Lisa | Invent people |
| **P0** | Bank the record: `upsert` / `log` / `brief` | **Done.** In-process SQLite `@/lib/memory`. | Jake | Schema from other lanes |
| **P0** | Contact research: sourced Exa **or** honest skip | **Coded.** `queue.ts` → `researchPerson`; query from what they said; name gate; `Fact.url`. Confirm in a Talk on a **full** name. One-word name with no company banks nothing. | Jake | Await Exa on Live |
| **P0** | Detection `signals` on every delegate | **Done.** name · role · company · commitment · ask · contact. `GET /api/runtime` for the UI lane. | Jake | Building UI for it |
| **P0** | Card + ledger show *this* conversation (`source` + `ts` + `url`) | **Partial.** `/` is operator chrome. Hide **Recall Jake**. Health/jobs strip for the kill beat. | Luis | Chat composer |
| **P0** | Kill/skip visible on `/` while Mac keeps talking | Kill API exists; **no on-screen proof** (Jake III). | Luis + Jake | Four failure demos |
| **P0** | 20s re-encounter (spoken-name recall) | **Required for C4=5.** Not face-rec. | Lisa + Luis | Parking this |
| **P0** | Two rehearsals, 2-min video, portal | **Open.** Freeze only if all four criteria are 5. | Luis + Lisa | Keep merging after freeze |

| Pri | Item | Status | Owner | Rule |
|---|---|---|---|---|
| **P1** | Hermes `HERMES_ENABLED=1` only if hall `:8768` is up | **Off.** Extra credit, not the C3=5 plan. `ws` is installed. | Lisa | Live never awaits packets |
| **P1** | OpenRouter if Live quota dies | Key in `web/.env.local`. **Not GPT Live.** Do not wire a second voice loop. | Lisa | |
| **P1** | Projector `/screen.html` | **Landed** (Luis, including a later upload). Room TV only if it shows *this* person. | Luis | Making it required |

| Pri | Item | Status |
|---|---|---|
| **P2** | Face-rec / sightings from `frame_ref` | Parked |
| **P2** | Mentra Live (`client/mentra`, `/glasses`) | Hardware live. **Not** the tape environment. JPEG on delegate, never a Live track. |
| **P2** | Auth0 / treg / embeddings | Skip |
| **P2** | `BACKEND_LLM=1` wiki | Opt-in. Jake has it on locally. Not the tape default. |
| **—** | Coach / roast | **Cut.** Mac is Gen Z cheerleader only. |

## Directives (next hours)

| Who | Do now | Stop doing |
|---|---|---|
| **Lisa** | Enroll first+last via Jake’s `detect` name signal (lowercase ASR). Two proof Talks. Talk track on tape. | Exa, Hermes-from-scratch, OpenRouter Live, roast, Mentra relay |
| **Jake** | Confirm one sourced Exa **or** honest skip against a **full** name in a live Talk. Rehearse the kill-research miss. `/api/runtime` is the UI handoff. | Face embeddings, wiki as the demo |
| **Luis** | Live person on `/`; ledger `source`+`ts`+`url`; health/jobs/traces from `GET /api/runtime`; hide Recall Jake. III notes in `memory/HANDOFF.md`. | Chat composer, making `/screen.html` required |
| **Saint** | Off the tape unless a 5s “same agent, glasses optional” cut. | Making glasses the environment |

Stay in lane. Shared types: `web/src/lib/types.ts`.

## Win script (2:00)

Canonical copy: [`SCORING.md`](./SCORING.md) (bars) · [`JUDGING.md`](./JUDGING.md) (spoken lines).

0:00 `/` **Talk** — *“A chatbox is too late.”*  
0:15 “Nice to meet you, FIRST LAST. I run X at Y.”  
0:35 Card banks full name; Mac reads it verbatim  
0:50 Fact + sourced Exa (or skip)  
1:10 Kill research *or* no glasses, same Mac  
1:25 Leave / come back / say the name — remembered card  
1:45 Ledger close — freeze  
1:55 Hang up

If glasses or `/screen.html` flake: stay on `/`.

## Named orchestration (say it)

**Client delegation + local memory (fast) + killable research queue (slow).**

Memory is SQLite in-process behind `@/lib/memory`. FastAPI `:7777` is retired.
Hermes/hall is the *same* slow plane when plugged in. `HERMES_ENABLED=0` is default.

Measured (LIVE-0002): delegation ~0.9 s; local Exa is the 1–3 s fast lane;
a Hermes room turn is ~17 s. [`LIVE_LOOP.md`](./LIVE_LOOP.md). Glasses: [`client/mentra/README.md`](../client/mentra/README.md).

## Already decided — do not reopen

- No Auth0
- No CopilotKit / TriggerDev / Mozilla
- **No video into GPT Live.** Camera may snapshot onto `POST /api/delegate` as `frame`. Never a Live media track.
- No stranger camera lookup
- Client delegation (not Responses)
- Live voice is **marin**; personality is Gen Z cheerleader. No coach/roast
- P0 demo is **browser mic**, even if glasses work
- Secrets in `web/.env.local` only
- OpenRouter / Oxen are text-only — neither has `gpt-live-1`
- Re-encounter on tape is spoken-name recall, not face-rec
