# 4-hour ship — status 2026-09-12 13:41 PDT

**Demo still:** bank the record + contact research, in a live conversation.
**P0 environment:** browser mic on `/`. Live agent is **Mac** (**Talk** / **Hang up**).
**Glasses:** additive. Saint’s Mentra Live client is **on hardware** (`/glasses`);
do not require it for the video.
**Projector:** Luis landed `/screen.html`. Room display only. Talk stays on `/`.

Read this before `PRD.md`. Second-pass / face-lock beats are **stretch**.

## What ships

Hear a name in the room → **bank** person + facts on the ledger → **research**
them in the background (Exa; Hermes if already up) → whisper card shows the
record. Conversation never waits on the network.

## Rank + status

| Pri | Item | Status | Owner | Do not |
|---|---|---|---|---|
| **P0** | Browser mic → **Talk** → Mac hears/speaks | **Done.** ICE hang fixed; Hang up cuts billing. Voice: `marin`. | Lisa | Typed chat |
| **P0** | Spoken name → card banks a person | **Done enough to demo** (Mickey enrolled). First/last split still sloppy. | Lisa | Invent people |
| **P0** | Bank the record: `upsert` / `log` / `brief` | **Done.** In-process SQLite `@/lib/memory` (Jake D17). Seed wipes in place. Not `:7777`. | Jake | Schema from other lanes |
| **P0** | Contact research: Exa timeout + skip; sourced fact on card | **Open.** `researchQuery` / `absorbResearch` exist; `queue.ts` still writes `[exa] …` slices. Lisa stays out. | Jake | Await Exa on Live |
| **P0** | Card + ledger show *this* conversation | **Partial.** `/` still operator chrome (seed + live name). Projector `/screen.html` is a bundled room screen — not wired to `/api/memory`. | Luis | Chat composer |
| **P0** | Two rehearsals, 2-min video, portal paste | **Open.** Freeze after take 2. | Luis + Lisa | Keep merging |

| Pri | Item | Status | Owner | Rule |
|---|---|---|---|---|
| **P1** | Kill/skip enrichment mid-talk | Open — `/api/enrich` kill exists; rehearse one miss | Jake | Don't demo four failures |
| **P1** | Hermes `HERMES_ENABLED=1` only if hall `:8768` is up | **Off.** Default `0`. `ws` is now in `web/package.json` (Jake). | Lisa | Live never awaits packets |
| **P1** | OpenRouter if Live quota dies | **Key is in `web/.env.local`.** Nice-to-have. OpenRouter does **not** ship `gpt-live-1` — cannot replace Mac. Failover not wired. Oxen is the OpenAI-compatible text pool. | Lisa | Don't build a second voice loop unless OpenAI quota dies |
| **P1** | Projector `/screen.html` | **Landed** (Luis). Use as the room TV. Do not debug it on stage; `/` is the talk. | Luis | Making the projector required |

| Pri | Item | Status |
|---|---|---|
| **P2** | Second-pass recognition / re-encounter | **Parked** |
| **P2** | Mentra Live glasses (`client/mentra`, `/glasses`) | **Hardware live** (Saint). Mic+camera → laptop; Live voice on laptop by default. **Not** the P0 tape. Video is JPEG on delegate (`frame`), never a Live track. |
| **P2** | Face-rec / sightings from `frame_ref` | Parked — memory/face lane reads `web/data/frames/` |
| **P2** | Auth0 / login | Skip |
| **P2** | treg, embeddings, vector store | Exa is enough research |
| **P2** | LLM-Wiki / `BACKEND_LLM=1` | **Opt-in** (Jake). Default off. Not on the tape. |

## Lisa remaining (Live)

1. Spoken-name parser: first + last (`Mickey` / `Mouse`), not one token / “new contact.”
2. Cheerleader / Gen Z Mac prompt is in `LIVE_INSTRUCTIONS` (Hang up → Talk to load).
3. One proof take with Luis, then video + portal.

Stay out of Exa / SQLite schema / UI chrome / Mentra relay.

`GptLiveClient` now has a **client seam** (`microphone`, `onOutputTrack`, `snapshot`).
Do not rip it out. Browser `/` still uses default getUserMedia.

## Lane hours (remaining)

| Who | Now | Stop doing |
|---|---|---|
| **Lisa** | Name capture + tape | Exa, Mentra relay, Auth0 |
| **Jake** | Exa write-back: patch `queue.ts` to `researchQuery` / `absorbResearch` | Face embeddings unless P0 is taped |
| **Luis** | Live person on the `/` card + source/ts ledger; optional: point projector at live memory | Chatbox |
| **Saint** | Mentra is live; keep it off the P0 tape. Browser `/` is the demo. | Making glasses required |

## Demo beats (2 min) — P0 only

0:00 Browser `/` — **Talk**  
0:20 Spoken intro (“nice to meet you, NAME”) → card banks them  
0:50 Talk → a fact lands on the card/ledger  
1:10 Research returns (or skip) → sourced line on the card  
1:40 One failure: kill enrichment *or* “no glasses, same agent”  
1:50 Ledger close on `/` (projector only if it shows *this* person) — freeze  

If glasses or `/screen.html` flake: same Mac on `/`. Do not debug Mentra or the bundle on stage.

Second-person recall is **cut**. Roast mode is **cut** — Mac is Gen Z cheerleader only.

## Named orchestration (say it)

**Client delegation + local memory (fast) + killable research queue (slow).**

Memory is SQLite in-process behind `@/lib/memory` (Jake D17). FastAPI `:7777` is retired.
Hermes/hall is the *same* slow plane when plugged in. `HERMES_ENABLED=0` is default.

Measured (LIVE-0002): delegation ~0.9 s; local Exa is the 1–3 s fast lane;
a Hermes room turn is ~17 s. Append spoken results only after output-transcript
idle. Details: [`LIVE_LOOP.md`](./LIVE_LOOP.md). Glasses: [`client/mentra/README.md`](../client/mentra/README.md).

## Already decided — do not reopen

- No Auth0
- No CopilotKit / TriggerDev / Mozilla
- **No video into GPT Live.** Camera may snapshot onto `POST /api/delegate` as `frame` (P2). Never a Live media track.
- No stranger camera lookup
- Client delegation (not Responses)
- Second-pass recognition is stretch
- Secrets in `web/.env.local` only
- Live voice is **marin**; personality is Gen Z cheerleader (`LIVE_INSTRUCTIONS`). No coach/roast toggle.
- P0 demo is **browser mic**, even if glasses work
