# Submission — OpenAI Global Hackathon @ The KINN

Portal checklist. Luis packs this; Lisa is in the 2-minute video on GPT Live.

## Challenge (one sentence)

An agent that lives **in the conversation** — Mentra glasses when we have them, this
browser when we don’t — and is useful *because* you cannot stop to open a chat.

Environment is essential: a standalone chatbox cannot bank a contact and
research them while you shake someone’s hand.

## Portal fields

| Field | Paste this |
|---|---|
| **Title** | MMG — whisper card for the room you’re in |
| **Description** | *(below)* |
| **Public GitHub** | https://github.com/reimagen/mmg |
| **2-minute video** | Record the run of show in [`JUDGING.md`](./JUDGING.md). Start on **browser mic** so it always runs; cut to glasses HUD if Saint is live. |
| **Social post** | *(draft below)* |

### Description (written)

MMG is a social copilot for a networking floor. GPT Live listens through the
laptop browser — Mentra glasses if we have them, same agent if we don’t.
When you meet someone, it **banks the record** (name, facts from the talk) and
**researches** them in the background. A whisper card is the ground truth:
name, what you just learned, one sourced line. Strangers are enrolled by
spoken name only; there is no stranger camera lookup.

The architecture is three isolated loops: a latency-critical Live session
(client delegation), a local Memory API (upsert/log/brief under 150 ms, never
behind the network), and a killable research queue (local Exa; Hermes
`room:research` when the hall is up). If research dies, the conversation does not.

It banks the room so you don’t have to.

## Eligibility (what was built today vs building blocks)

**Net-new during the event (submit this):**
- People-memory sidecar (`memory/` — schema, upsert/log/brief, seed)
- GPT Live client-delegation loop (`web/src/lib/live/`)
- Whisper-card + ledger UI (`web/src/app/`)
- Exa killable contact-research queue
- Failure modes: browser as the environment, spoken-name enroll, research skip

**Building blocks (allowed; not the project):**
- OpenAI GPT Live / WebRTC
- MentraOS / Mentra Live SDK
- Exa Search, treg catalog
- Bootoshi hall *architecture* + Hermes room runtime (building blocks, not a resubmitted product)
- Next.js, FastAPI, SQLite

A pre-existing chief-of-staff / Hermes hall is **not** the submission. We used
its contracts and plan to connect Hermes as the slow-plane runtime. Core
functionality (memory in the live conversation) was built today.

## Social draft

Need partner handles from the portal — fill `@`s before posting.

> Built MMG at @OpenAI’s Global Hackathon: a whisper card for the room you’re
> in. It banks who you just met and researches them while you talk. Glasses
> if you have them, browser if you don’t.  
> github.com/reimagen/mmg  
> #[tag from portal] @Mentra @ExaAI @OxenAI

## Deadline

Whatever the hackathon portal shows. Freeze code after two rehearsals.
Do not keep merging after the video is shot. Second-pass recognition is not
a reason to delay submit.
