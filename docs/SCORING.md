# Scoring tracker — 1 to 5

Judges score **every** project 1–5 on each criterion after submissions close.
Update **Now** after each rehearsal. Target is **4** on all four.

**Plan:** [`SHIP.md`](./SHIP.md). Live E2E is green. Exa + tape still open. Second-pass
is **not** a blocker to 4.

Last updated: 2026-09-12 13:41 PDT (Luis projector `/screen.html`; Jake SQLite + `ws`; Exa absorb + tape still open).

| Criterion | Now | Target | Stretch | Owner | Blocker to 4 |
|---|---:|---:|---:|---|---|
| 1. Core Requirements & Functionality | 3 | 4 | 5 | Lisa + Luis | Same session: fact on ledger (name already banks) |
| 2. Innovation & Theme Alignment | 3 | 4 | 5 | Lisa (talk track) | Tape it in-conversation, no typed chat |
| 3. Technical Execution & Integration | 3 | 4 | 5 | Lisa + Jake | SQLite memory is live; Exa skip/line still Jake |
| 4. Usefulness & Agentic Experience | 2 | 4 | 5 | Luis + Lisa | `/` ledger shows banked facts + one research line. Projector does not move this until it shows live memory. |
| **Sum (max 20)** | **11** | **16** | **20** | | |

Do not mark 4 until a human has run that beat without narrating a mock.

---

## 1. Core Requirements & Functionality

| To reach | Must be true in the video |
|---:|---|
| 3 | Browser mic Live starts; spoken name paints the whisper card. |
| 4 | Same session: bank + at least one new fact on the ledger. Glasses absent is fine. |
| 5 | Two rehearsals, no crash, operator never types the name. |

- [x] **Talk** connects GPT Live (browser mic)
- [x] Spoken intro → card with a new person (quality: first/last still sloppy)
- [ ] New fact from the talk lands on the card/ledger
- [ ] Rehearsal #2 with the same script

~~Second enrolled person / re-encounter~~ — P2, not required for 4.

---

## 2. Innovation & Theme Alignment

| To reach | Must be true in the video |
|---:|---|
| 3 | Agent listens and speaks in-room; we never type a prompt. |
| 4 | Card exists *because* you cannot Alt-Tab a CRM mid-handshake. |
| 5 | Talk track: “A chatbox is too late.” Then bank a stranger by voice. |

- [ ] No typed chat in the two-minute video
- [ ] Browser-without-glasses framed as the room, not a backup app
- [ ] Spoken-name enroll — no camera lookup

---

## 3. Technical Execution & Integration

Named orchestration: **client delegation + local memory (fast) + killable research queue (slow).**

| To reach | Must be true in the video |
|---:|---|
| 3 | `/api/delegate` banks into SQLite (`web/data/memory.db`), not the JSON stub. |
| 4 | One rehearsed failure: kill/skip Exa *or* no glasses; conversation continues. |
| 5 | Hermes live *or* a second failure (quota → Oxen). Stretch only. |

- [x] Memory backend = SQLite in-process (`MEMORY_BACKEND` unset)
- [ ] Exa timeout + skip (kill or pull the key) — **Jake**
- [x] UI card = verbatim ground truth (voice may paraphrase)

---

## 4. Usefulness & Agentic Experience

| To reach | Must be true in the video |
|---:|---|
| 3 | Card is short (name + what we banked). Ledger visible. |
| 4 | Research line (or honest skip) appears without blocking speech. |
| 5 | Second-pass recall — only if P0 is already taped. Roast is cut. |

Agent actions that must happen: `upsert` · `log` · `brief` · enrich-later.
`recall` by face / re-encounter is P2.

- [ ] Whisper is short (no lecture)
- [ ] Ledger shows timestamps + source (live vs exa) — Jake’s API already returns them; `/` and `/screen.html` do not show them yet
- [ ] No bystander transcript on screen

---

## Rehearsal log

| Take | Time | C1 | C2 | C3 | C4 | Notes |
|---|---|---:|---:|---:|---:|---|
| 1 | | | | | | |
| 2 | | | | | | freeze after this if both ≥4 |

Run of show: [`JUDGING.md`](./JUDGING.md). Portal: [`SUBMISSION.md`](./SUBMISSION.md).
