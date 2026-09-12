# Judging map — 4-hour run of show

Track 1–5 in [`SCORING.md`](./SCORING.md). Ranked plan: [`SHIP.md`](./SHIP.md).

**Video proves:** live conversation → bank a contact → research them → **remember them**.
Target is **5 on all four** ([`SCORING.md`](./SCORING.md)).

## 1. Core Requirements & Functionality

**Bar for 5:** robust, reliable, fully functional in the intended environment.

| Demo beat | Proof |
|---|---|
| **Talk** (browser mic) | Agent runs **in the conversation**, not a chat form. |
| Whisper card banks a name | Spoken intro → `upsert` / `brief` → card + speech. |
| A fact + a research line | Pre-flight **roster** line on the card (`(event roster)` + URL), or an honest skip. Roster is not the ledger. |
| No glasses | Do not stall. Input stays `browser`. |

Script line: *“This is Mac, in the room. The panel is the room, not a backup app.”*

## 2. Innovation & Theme Alignment

**Bar for 5:** a pattern you could not reproduce as a standalone chatbox.

A chatbox waits for you to type “save this person.” During the handshake that is
already too late. We listen, bank, and research **while you talk**.

Script line: *“You can’t Alt-Tab a CRM while shaking someone’s hand.”*

## 3. Technical Execution & Integration

**Bar for 5:** exceptional engineering, robust orchestration, thoughtful failure handling.

Say out loud:

**Client delegation + local memory (fast) + killable research queue (slow).**

Hermes/hall is a **ripcord**. The video does not need Hermes live. Pull it if time is short.

| Failure (pick **one** for the tape) | What judges should see |
|---|---|
| No glasses | Browser mic, same agent |
| Exa/Hermes timeout | Skip; conversation never waits |
| Memory down | Agent keeps talking, card says un-augmented |

Do not spend the 2 minutes on face-miss, quota failover, and hall packets.

## 4. Usefulness & Agentic Experience

**Bar for 5:** context used intelligently, native, controllable.

| Control | What they get |
|---|---|
| Whisper card | Name + what we just banked + one research line. 2 sentences. |
| Memory ledger | Person, facts, timestamps — close shot |
| Consent | Spoken-name enroll; no stranger camera lookup |

The agent **does** enroll, log, brief, enrich, and **recall by spoken name**.
It does **not** dump bystander transcripts. Roast mode is cut. Re-encounter is on the tape (C4=5).

## 2-minute run of show

0:00 `/` **Talk** — *“A chatbox is too late.”* — *C1 + C2*  
0:15 Spoken intro, first **and** last + one fact — *C1 enroll*  
0:35 Card banks them; Mac reads it verbatim — *C4*  
0:50 Research line (or honest skip) — *C3 slow plane*  
1:10 Kill enrichment *or* no glasses, same Mac — *C3 failure*  
1:25 Re-encounter: say the name, remembered card — *C4=5*  
1:45 Ledger close (source + ts) — freeze
