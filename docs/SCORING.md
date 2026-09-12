# Scoring tracker — 1 to 5

Judges score **every** project 1–5 on each criterion after submissions close.
Update **Now** after each rehearsal. Target is **4** on all four; stretch **5**
on Technical (orchestration + failure handling — that is the meeting bar).

Last updated: 2026-09-12 11:54 PDT (scaffold, not yet rehearsed).

| Criterion | Now | Target | Stretch | Owner | Blocker to 4 |
|---|---:|---:|---:|---|---|
| 1. Core Requirements & Functionality | 2 | 4 | 5 | Lisa + Luis | Live session actually hears a name and paints the card |
| 2. Innovation & Theme Alignment | 2 | 4 | 5 | Lisa (talk track) | Demo must happen *in* conversation, not a typed chat |
| 3. Technical Execution & Integration | 2 | 4 | 5 | Lisa + Jake | Show client-delegation + sidecar + a killed Exa queue |
| 4. Usefulness & Agentic Experience | 2 | 4 | 5 | Luis (panel) + Lisa (voice) | Coach/roast + second-person recall on camera |
| **Sum (max 20)** | **8** | **16** | **20** | | |

How to bump: after a rehearsal, change **Now** and the evidence lists. Do not
mark 4 until a human has run that beat without the operator narrating a mock.

---

## 1. Core Requirements & Functionality

Does it deliver a working agent in a place people already work, talk, or live?
Does the core workflow function end to end?

| Score | Official bar |
|---:|---|
| 1 | Does not run, or is not a functional agent. |
| 2 | Parts run; core workflow or environment integration is incomplete. |
| 3 | Basic end-to-end agent in the intended environment, with limitations or bugs. |
| 4 | Works reliably; complete agent experience; only minor issues. |
| 5 | Robust, reliable, fully functional in its intended environment. |

**Now = 2.** Memory API, operator shell, and Live client exist. Glasses are
optional. We have not yet proven Start → hear “Jake” → card + voice in one take.

| To reach | Must be true in the video |
|---:|---|
| 3 | Browser mic Live session starts; one recall paints the whisper card. |
| 4 | Same loop twice (Jake, then a second enrolled person) without restart. Glasses absent is fine. |
| 5 | Two rehearsals, no crash, glasses *or* browser, operator never types the name. |

Environment for this criterion: **the live conversation** (browser mic always;
Mentra HUD if Saint is up). Not a chat composer.

- [ ] `Start GPT Live · browser mic` connects (`session.started`)
- [ ] Spoken “Jake” → card with schema thread
- [ ] New fact from the talk lands on the card
- [ ] Second enrolled person, no page reload
- [ ] Rehearsal #2 with the same script

---

## 2. Innovation & Theme Alignment

Does it explore a compelling new place or interaction for agents?
Does the environment materially improve what the agent can do?

| Score | Official bar |
|---:|---|
| 1 | Generic chatbot/automation; environment is irrelevant. |
| 2 | Eligible environment, but it is mostly a wrapper. |
| 3 | Clearly on theme; environment adds meaningful value. |
| 4 | Environment shapes the core workflow; original agent experience. |
| 5 | Surprising pattern whose central value **could not** be a standalone chatbox. |

**Now = 2.** The *idea* is a 4–5 (handshake-time whisper). If judges only see a
dashboard we click, they will score wrapper (2).

| To reach | Must be true in the video |
|---:|---|
| 3 | Agent listens and speaks in-room; we never type a prompt. |
| 4 | Card exists *because* you cannot Alt-Tab. Spoken-name enroll on a stranger. |
| 5 | One line in the talk track: “A chatbox is too late.” Then prove it with the handshake beat. |

Talk track (Lisa): *“You can’t Alt-Tab a chatbot while shaking someone’s hand.”*

- [ ] No typed chat in the two-minute video
- [ ] Browser-without-glasses is framed as the same place (the room), not a backup app
- [ ] Stranger path: “nice to meet you, NAME” — no camera lookup

---

## 3. Technical Execution & Integration

Code, architecture, reliability, tool use, data handling, depth of integration.

| Score | Official bar |
|---:|---|
| 1 | Conceptual or mocked. |
| 2 | Basic, unstable, or superficial integrations. |
| 3 | Solid execution and working integrations; some rough edges. |
| 4 | Well engineered, reliable; tools, data, and environment integrated. |
| 5 | **Exceptional engineering: robust orchestration, thoughtful failure handling, deeply integrated architecture.** |

**Now = 2.** The architecture is specified (client delegation + memory sidecar +
killable Exa). Jake’s FastAPI is real. Live/Exa/OpenRouter fallbacks are not all
proven on a mic.

Named orchestration (say it): **client delegation + memory sidecar (fast) + hall/Exa queue (slow).**

| To reach | Must be true in the video |
|---:|---|
| 3 | Live tool path hits `recall`/`brief` for real (not a hardcoded string). |
| 4 | One rehearsed failure: unplug glasses *or* kill enrichment; conversation continues. |
| 5 | Show the board: glasses miss → browser; face miss → spoken name; Exa timeout → skip; Live quota → OpenRouter/Oxen. Privacy: enrolled faces only. |

- [ ] `/api/delegate` returns a card from Jake’s `:7777`, not the JSON stub
- [ ] Exa call has timeout + skip (kill button or pull the key mid-demo)
- [ ] Memory down: agent still talks, card says un-augmented
- [ ] Token pool story ready (even if we only fail over once)
- [ ] UI card = verbatim ground truth (voice may paraphrase)

---

## 4. Usefulness & Agentic Experience

Clear value? Intuitive, effective, appropriate to the environment?

| Score | Official bar |
|---:|---|
| 1 | Unclear use case; little value. |
| 2 | Recognizable use case; agent is mostly prompt-and-response. |
| 3 | Useful; understandable; meaningful actions; reasonable user control. |
| 4 | Solves a clear problem; agent feels native; strong people↔AI interaction. |
| 5 | Substantial value, designed for this environment, context used intelligently, still clear and controllable. |

**Now = 2.** Coach/roast toggle and memory list are on the panel. Value is
unproven until a human uses the card *while talking*.

| To reach | Must be true in the video |
|---:|---|
| 3 | Card is 2 sentences (name, met, one thread). Operator can toggle coach/roast. |
| 4 | Second encounter uses an *open thread* (“ask about the schema”). Wearer/operator did not look at notes. |
| 5 | Close line, on the ledger: “It remembers so you don’t have to.” Consent visible (enrolled vs stranger). |

Agent actions (must happen, not just be described): `recall` · `upsert` · `log` · `brief` · enrich-later.

- [ ] Whisper is short (no lecture)
- [ ] Roast is one beat, then back
- [ ] Ledger shows timestamps
- [ ] No bystander transcript on screen

---

## Rehearsal log

| Take | Time | C1 | C2 | C3 | C4 | Notes |
|---|---|---:|---:|---:|---:|---|
| 1 | | | | | | |
| 2 | | | | | | freeze after this if both ≥4 |

Run of show: [`JUDGING.md`](./JUDGING.md). Portal paste: [`SUBMISSION.md`](./SUBMISSION.md).
