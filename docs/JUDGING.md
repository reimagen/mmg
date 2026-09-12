# Judging map — 4-hour run of show

Track 1–5 in [`SCORING.md`](./SCORING.md). Ranked plan: [`SHIP.md`](./SHIP.md).

**Video proves:** live conversation → bank a contact → research them.
Second-pass recognition is **not** in this script.

## 1. Core Requirements & Functionality

**Bar for 5:** robust, reliable, fully functional in the intended environment.

| Demo beat | Proof |
|---|---|
| `Start GPT Live · browser mic` | Agent runs **in the conversation**, not a chat form. |
| Whisper card banks a name | Spoken intro → `upsert` / `brief` → card + speech. |
| A fact + a research line | `log_interaction` and Exa (or skip) show on card/ledger. |
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

**Client delegation + memory sidecar (fast) + killable research queue (slow).**

Hermes/hall is that queue when plugged in. The video does not need Hermes live.

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

The agent **does** enroll, log, brief, and enrich. It does **not** dump bystander
transcripts. Roast and second-person recall are optional if time.

## 2-minute run of show

0:00 Browser mic — *C1, environment*  
0:20 Spoken intro — card banks them — *C2 + C4*  
0:50 Talk, fact lands on ledger — *agentic, not Q&A*  
1:10 Research line (or honest skip) — *slow plane*  
1:35 One failure beat (no glasses *or* kill Exa) — *C3*  
1:50 Ledger close — freeze
