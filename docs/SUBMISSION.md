# Submission — OpenAI Global Hackathon @ The KINN

Portal checklist. Luis packs this; Lisa is in the 2-minute video on GPT Live.

## Challenge (one sentence)

An agent that lives **in the conversation** — Mentra glasses when we have them, this
browser when we don’t — and is useful *because* you cannot stop to open a chat.

Environment is essential: a standalone chatbox cannot whisper a card while you
shake someone’s hand.

## Portal fields

| Field | Paste this |
|---|---|
| **Title** | MMG — whisper card for the room you’re in |
| **Description** | *(below)* |
| **Public GitHub** | https://github.com/reimagen/mmg |
| **2-minute video** | Record the run of show in [`JUDGING.md`](./JUDGING.md). Start on **browser mic** so it always runs; cut to glasses HUD if Saint is live. |
| **Social post** | *(draft below)* |

### Description (written)

MMG is a social copilot for a networking floor. GPT Live listens through Mentra
smart glasses or, if glasses are down, the laptop browser — same agent, same
memory. When you meet someone it already knows, a whisper card appears: name,
how you met, one open thread. Coach and roast-me modes share that memory.
Strangers are enrolled by spoken name only; faces are matched for consenting
demo participants.

The architecture is three isolated loops: a latency-critical Live session
(client delegation), a local Memory API (recall/brief under 150 ms, never
behind the network), and a killable Exa enrichment queue that upgrades the
*next* card. If enrichment dies, the conversation does not.

It remembers so you don’t have to.

## Eligibility (what was built today vs building blocks)

**Net-new during the event (submit this):**
- People-memory sidecar (`memory/` — schema, four tools, seed)
- GPT Live client-delegation loop (`web/src/lib/live/`)
- Whisper-card operator UI (`web/src/app/`)
- Exa/treg killable enrichment queue
- MentraOS miniapp stub + glasses→ingest path
- Failure modes: browser fallback, spoken-name enrollment, token pools

**Building blocks (allowed; not the project):**
- OpenAI GPT Live / WebRTC
- MentraOS / Mentra Live SDK
- Exa Search, treg catalog
- Bootoshi hall *architecture* as a reference (not a resubmitted product)
- Next.js, FastAPI, SQLite

A pre-existing chief-of-staff / Hermes hall is **not** the submission. We used
its contracts. Core functionality (memory in the live conversation) was built
today.

## Social draft

Need partner handles from the portal — fill `@`s before posting.

> Built MMG at @OpenAI’s Global Hackathon: a whisper card for the room you’re
> in. Glasses if you have them, browser if you don’t. It remembers who you just
> met so you don’t have to.  
> github.com/reimagen/mmg  
> #[tag from portal] @Mentra @ExaAI @OxenAI

## Deadline

Whatever the hackathon portal shows. Freeze code after two rehearsals (hour 6).
Do not keep merging after the video is shot.
