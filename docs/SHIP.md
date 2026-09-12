# 4-hour ship — critical path vs nice-to-have

**Clock:** ~4 hours left. **Demo:** bank the record + contact research, in a live
conversation. **Environment:** browser mic. Glasses optional.

Read this before `PRD.md`. Older 6-hour / second-pass / face-lock beats are
**stretch**, not the video.

## What ships

Hear a name in the room → **bank** person + facts on the ledger → **research**
them in the background (Exa; Hermes if already up) → whisper card shows the
record. Conversation never waits on the network.

## Rank

| Pri | Item | Why it scores | Owner | Do not |
|---|---|---|---|---|
| **P0** | Browser mic → `Start GPT Live` → spoken name → card | C1 + C2. Without this we are a dashboard. | Lisa | Typed chat |
| **P0** | Bank the record: `upsert_person` + `log_interaction` + `brief` | The product. Ledger is the close shot. | Lisa + Jake | Invent people |
| **P0** | Next client talks to Jake `:7777` (`MEMORY_API_URL`) | JSON stub is not banking. | Lisa (client) | New schema |
| **P0** | Contact research: Exa timeout + skip; sourced fact lands | Slow plane, C3 + C4. | Lisa | Await Exa on Live |
| **P0** | Card + ledger show banked + researched facts | C4. UI is ground truth. | Luis | Chat composer |
| **P0** | Two rehearsals, 2-min video, portal paste | Deadline. Freeze after take 2. | Luis + Lisa | Keep merging |

| Pri | Item | Why | Owner | Rule |
|---|---|---|---|---|
| **P1** | Kill/skip enrichment mid-talk; conversation continues | C3 failure handling. One rehearsed miss is enough. | Lisa | Don't demo four failures |
| **P1** | Hermes `HERMES_ENABLED=1` **only if hall `:8768` is already running** | Same slow plane as local Exa. Do not stand up hall from scratch. | Lisa | Live never awaits packets |
| **P1** | Coach / roast toggle, one beat | Controllable. Drop if P0 is late. | Luis + Lisa | One jab, then back |
| **P1** | OpenRouter story if Live quota dies | Token pool. Don't build Oxen unless quota is actually dying. | Lisa | |

| Pri | Item | Status |
|---|---|---|
| **P2** | Second-pass recognition / re-encounter / “ask about X” | **Parked.** Return only if P0 is green with time left. |
| **P2** | Face-rec, sightings, glasses HUD | Optional environment. Audio-only is valid. |
| **P2** | Auth0 / login | Skip. One local operator. |
| **P2** | treg, embeddings, vector store | Exa is enough research. |
| **P2** | Full token-pool failover board, `/hall/briefing`, `cos` room | Not in the video. |
| **P2** | MentraOS as a required path | Nice if Saint is live; never block P0. |

## Lane hours (remaining)

| Who | P0 only | Stop doing |
|---|---|---|
| **Lisa** | Live E2E, delegate → bank, wire `:7777`, Exa fact on card | Hall extraction, second-pass prompts, Auth0 |
| **Jake** | `upsert`/`log`/`brief` real; seed one demo person | Face embeddings, sighting pipeline |
| **Luis** | Card + ledger for *this* conversation; script + submit | Second-guest UI, chatbox, polish beyond the card |
| **Saint** | Stay out of P0. Browser mic is the environment. Glasses if already working. | Face lock as a demo beat |

## Demo beats (2 min) — P0 only

0:00 Browser mic, Start GPT Live  
0:20 Spoken intro (“nice to meet you, NAME”) → card banks them  
0:50 Talk → a fact lands on the card/ledger  
1:10 Research returns (or skip) → sourced line on the card  
1:40 One failure: kill enrichment *or* “no glasses, same agent”  
1:50 Ledger: person, facts, timestamps — freeze  

Roast and second-person recall are **cut** unless P0 is already on tape.

## Named orchestration (say it)

**Client delegation + memory sidecar (fast) + killable research queue (slow).**

Hermes/hall is the *same* slow plane when plugged in. Do not imply Hermes is
required for the video. `HERMES_ENABLED=0` is the default ship path.

## Already decided — do not reopen

- No Auth0
- No CopilotKit / TriggerDev / Mozilla
- No video into GPT Live
- No stranger camera lookup
- Client delegation (not Responses)
- Second-pass recognition is stretch
- Secrets in `web/.env.local` only
