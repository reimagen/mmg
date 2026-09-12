# Scoring tracker — 1 to 5

Judges score **every** project 1–5 on each criterion after submissions close.
**Target is 5 on all four (20).** We are here to win. 4 is a miss.

**Now is only what a human has seen on `/`, not what is coded.** Empty rehearsal
log → nothing is locked. Plan: [`SHIP.md`](./SHIP.md). Run of show: [`JUDGING.md`](./JUDGING.md).

Last updated: 2026-09-12 13:59 PDT (target flipped to 5; Jake Exa/detect coded, not yet seen).

| Criterion | Now | Target | Owner | Blocker to 5 |
|---|---:|---:|---|---|
| 1. Core Requirements & Functionality | 3 | 5 | Lisa + Luis | First+last enroll + fact on ledger, then **two** crash-free Talks with no typing |
| 2. Innovation & Theme Alignment | 3 | 5 | Lisa (talk) + Luis (no chatbox) | Script the handshake line; kill “Recall Jake”; bank a stranger while talking |
| 3. Technical Execution & Integration | 3 | 5 | Lisa + Jake + Luis | Show the three loops **and** a kill/skip **on screen**; sourced Exa or honest skip |
| 4. Usefulness & Agentic Experience | 2 | 5 | Luis + Lisa | Live card + source/ts/url ledger, then a **20s re-encounter** that uses memory |
| **Sum (max 20)** | **11** | **20** | | |

Do not mark 4 or 5 until a human has run that beat without narrating a mock.

---

## Honest Now (why 11, not 16)

Jake’s detection + `researchPerson` Exa loop **is on `main`**. Luis’s projector **is on `main`**.
Neither has been proven in a Talk. Coded ≠ scored.

| What judges would see today on `/` | Score impact |
|---|---|
| Talk / Hang up, Mac speaks, Mickey banks (one token) | C1 = 3, C2 = 3 |
| SQLite behind `/api/delegate` | C3 = 3 (engineering floor) |
| Operator chrome, seed people, “Recall Jake”, no source/ts | C4 = 2 |
| First+last not written into `display_name` (Lisa INTRO is one word; Jake `signals` are unused by enroll) | Blocks C1=5 and Jake’s Exa name-gate |
| Rehearsal log empty | Caps every criterion |

---

## 1. Core Requirements & Functionality

**Bar for 5:** robust, reliable, fully functional in the intended environment (browser mic).

| To reach | Must be true in the video |
|---:|---|
| 3 | Browser mic Live starts; spoken name paints the whisper card. **Have this.** |
| 4 | Same session: bank + at least one new fact on the ledger. Glasses absent is fine. |
| 5 | Two rehearsals, no crash, operator never types the name. First **and** last name on the card. |

**To 5**
1. Lisa: `delegation.ts` enrolls Jake’s `name` signal (first+last, lowercase ASR).
2. Same Talk: a heard fact lands on the card/ledger (`log` / `brief`).
3. Take 1 + take 2, identical script, no crash, no keyboard.
4. Hide or relabel **Recall Jake** — it reads as typed recall.

- [x] **Talk** connects GPT Live (browser mic)
- [x] Spoken intro → a new person (one token; first/last still sloppy)
- [ ] First + last on `display_name`
- [ ] New fact from the talk lands on the card/ledger
- [ ] Rehearsal #2 with the same script

---

## 2. Innovation & Theme Alignment

**Bar for 5:** a pattern you could not reproduce as a standalone chatbox.

| To reach | Must be true in the video |
|---:|---|
| 3 | Agent listens and speaks in-room; we never type a prompt. **Have this on Talk.** |
| 4 | Card exists *because* you cannot Alt-Tab a CRM mid-handshake. |
| 5 | Say it, then prove it: bank + research a stranger **during** the handshake. |

**To 5** — this is script + discipline, not a new product.
1. Open on `/` Talk (not `/screen.html`, not `/glasses`).
2. Line: *“You can’t Alt-Tab a CRM while shaking someone’s hand. A chatbox is too late.”*
3. Immediately: spoken intro → card → research line while still in conversation.
4. Zero typed UI in frame. Cut “Recall Jake.” Projector is the room TV only if it shows **this** person.

- [ ] No typed chat in the two-minute video
- [ ] Browser-without-glasses framed as the room, not a backup app
- [ ] Spoken-name enroll — no camera lookup

---

## 3. Technical Execution & Integration

**Bar for 5:** exceptional engineering, robust orchestration, thoughtful failure handling.

Say out loud: **Client delegation + local memory (fast) + killable research queue (slow).**

Jake already wired the slow plane (`researchPerson` → name gate → sourced facts or skip).
Hermes is the *same* queue if hall is already up — **ripcord**. Do not start hall
from scratch. If time is short, leave `HERMES_ENABLED=0` and tape local Exa.
OpenRouter **dropped** (2026-09-12 catalog: `openai/gpt-live-1` 404, no Live/Realtime models). Oxen cannot replace GPT Live either. Neither is a C3=5 path.

| To reach | Must be true in the video |
|---:|---|
| 3 | `/api/delegate` banks into SQLite, not the JSON stub. **Have this.** |
| 4 | One rehearsed failure: kill/skip Exa *or* no glasses; conversation continues. |
| 5 | Judges **see** the three loops *and* the failure. Sourced Exa line **or** honest skip on screen (`jobs[].result`). Kill research mid-talk; Mac keeps talking. |

**To 5**
1. Luis: LoopHealth / jobs from `GET /api/runtime` visible (Jake’s finding — kill has no proof today).
2. Proof Talk: full name + company → Exa fact with `url` **or** skip text, Talk never stalls.
3. On tape: kill enrichment (`POST /api/enrich` kill) *or* pull the key; card stays; speech continues.
4. One sentence of orchestration. **Do not debug Hermes on stage.** Pull the ripcord: local Exa only.

- [x] Memory backend = SQLite in-process (`MEMORY_BACKEND` unset)
- [x] Exa loop coded (`researchPerson` in `queue.ts`) — **not yet seen on the card**
- [ ] Kill/skip visible on `/`
- [ ] UI card = verbatim ground truth in the take

---

## 4. Usefulness & Agentic Experience

**Bar for 5:** context used intelligently, native, controllable.

Roast is **cut**. Second-pass is **required for 5** (20 seconds, not a product rewrite).

| To reach | Must be true in the video |
|---:|---|
| 3 | Card is short (name + what we banked). Ledger visible. |
| 4 | Research line (or honest skip) appears without blocking speech. Source + ts on the ledger. |
| 5 | Walk off, come back, Mac uses the banked record (name + a fact). Hang up is the control. |

**To 5**
1. Luis: live person on the `/` card; ledger shows `source` + `ts` + `url` (`Fact.url` exists). Cut bystander transcript.
2. Card stays ≤ 2 sentences (`brief` already templates this).
3. **Re-encounter beat:** after the research line, leave the frame / Hang up / Talk again (or stay connected) and say the same name — Mac’s card is the *remembered* person, not a new contact. That is “context used,” not a chat Q&A.
4. Controllable: Hang up cuts billing; optional kill on the rail.

- [ ] Whisper is short (no lecture)
- [ ] Ledger shows timestamps + source (live vs exa) + url
- [ ] No bystander transcript on screen
- [ ] Re-encounter uses memory

Agent actions on tape: `upsert` · `log` · `brief` · enrich-later · `recall` by **spoken name** (not face).

---

## Win script (2:00) — every 5 lives here

0:00 `/` **Talk** — *“Chatbox is too late.”* — **C2, C1 environment**  
0:15 “Nice to meet you, FIRST LAST. I run X at Y.” — **C1 enroll**  
0:35 Card banks full name; Mac reads it verbatim — **C4 card**  
0:50 Fact + sourced Exa (or skip) on card/ledger — **C3 slow plane, C4=4**  
1:10 Kill research *or* “no glasses, same Mac” — **C3 failure**  
1:25 Leave / come back / say the name — remembered card — **C4=5**  
1:45 Ledger: person, live vs exa, timestamps — freeze  
1:55 Hang up.

If projector flakes: stay on `/`. If glasses flake: stay on `/`. Do not spend the 2:00 on Mentra.

---

## Lane calls (only what 20 needs)

| Who | Do now | Do not |
|---|---|---|
| **Lisa** | First+last enroll via `detect` name signal; two proof Talks; talk track on tape | Exa, Hermes, OpenRouter, roast |
| **Jake** | Confirm one sourced Exa *or* honest skip against a **full** name in a live Talk | Face embeddings, wiki as the demo |
| **Luis** | Live card + source/ts/url; health/jobs strip; hide Recall Jake | Chat composer, making `/screen.html` required |
| **Saint** | Off the tape unless a 5s “same agent, glasses optional” cut | Making glasses the environment |

---

## Rehearsal log

| Take | Time | C1 | C2 | C3 | C4 | Notes |
|---|---|---:|---:|---:|---:|---|
| 1 | | | | | | |
| 2 | | | | | | freeze only if all four are 5 |

Portal: [`SUBMISSION.md`](./SUBMISSION.md).
