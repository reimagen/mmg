---
type: session
status: closed
created: 2026-09-12
updated: 2026-09-12
last_edited_by: jake
tags: [session, detection, research, roster, backend, sitrep]
---

# Session 13:30–15:07 — detection, real research, the event roster, and a front door

**Opened on:** "more features for detection from processing" + an III pass + "integrate into the
runtime such that the backend can be easily presented to user". Ended with the whole room in memory.

## Shipped (repo `main`, every commit pushed and mirrored)

| Area | What landed |
|---|---|
| **Detection** | `detect.ts` — signals on every turn (name + surname · role · company/project · commitment · ask · contact · correction), pure, both backends. Commitments become open threads; signals go into the keeper prompt so the model banks rather than re-derives. D25 |
| **Research** | `researchPerson` — real Exa, query built from what the person actually said, markdown-tidied facts, `Fact.url` provenance. D26–D27 |
| **Roster** | Pre-flight homework: `roster-seed.json` + per-person research, the event's **team page** and **77-person attendee list** (both login-only, scraped from the browser) via `POST /api/roster/import`. **83 people, 79 with real context**, committed as `web/roster.json` and self-hydrating. D31, D34, D35 |
| **Runtime surface** | `GET /api/runtime` — backend · health · counts · jobs · last 12 traces · roster · the focus person's wiki page. One call behind any status UI. D28 |
| **Front door** | `docs/BACKEND.md` (one page, linked from README/AGENTS/CLAUDE/SHIP) + `npm run backend:check`, which proves the loop in 20 s. D37 |
| **Corrections** | A rename keeps the misheard spelling as an alias; `upsert_person` gained `id` so a correction can address the record instead of forking it. D29 |
| **III pass** | Memory fixes applied (`recall` no longer writes `last_seen`; facts capped). UI findings handed to Luis — we do not own that lane. |

## Course corrections (worth reading before re-tightening anything)

- **The seed was fiction.** "Jake — Building the persistent memory system" were placeholder strings
  I wrote. Replaced with the real team from [[who/team]]. **Never invent context.** D33
- **Open-web attendee discovery returns strangers.** A same-day event has nothing indexed. The
  event's own pages had everything — they just needed a signed-in browser. D34
- **Employer extraction is not a regex problem.** "I work at" / "my company is" / "we're called" —
  the keeper returns `org`, the pattern is only a floor. D30
- **GPT Live has no recognizer vocabulary.** The session rejects `session.audio.input` outright.
  A parallel biased transcription pass (Plaud/Wispr shape) is the remaining upstream route, written
  up but not built. D32
- **I over-corrected on Seth.** Flagged a grammar-parser bug report as a wrong-person fact; Jake
  confirmed it was really his. The actual bugs were a wrong seeded name and substring matching.
  Word boundaries kept, blanket corroboration reverted. **A surprising fact is not a wrong one —
  follow the `url`.** D36 (revised)

## State at close

`main` @ `0fdd503` · graph mirrored @ `92a5416` · backend `model` (gpt-5.4-mini) · 8 teammates
banked · roster 83/79 · dev server in tmux `mmg` (left running). `npm run memory:check` and
`npm run backend:check` both green.

## Next session prompt

`mirror.sh pull` → `npm run backend:check` to confirm the loop → rehearse the two beats (roster
warm-start on a stranger's first name; kill research mid-talk) → fill the rehearsal log in
`docs/SCORING.md` and the AAR in `how/campaigns/campaign_memory_p0.md`. Optional if the clock
allows: the parallel biased-ASR pass (HANDOFF 15:35) and the four UI findings for Luis.

## Addendum 15:20 — pre-demo verification (superpowers: verification-before-completion)

Ran the full check on Jake's request before the demo. It caught a live defect, which is the point
of running it rather than asserting it.

**Found:** "nice to meet you, Prashant" returned a cold card. The team page and the attendee list
both carry him ("Prashant Pisipati" / "Prashant Pawan Pisipati"), so the unique-first-name rule saw
two people and refused. Same shape for Robert and Seth.

**Fixed:** `lookupRoster` merges rows sharing a first **and** last name, keeping the richer one; two
different Aarons stay ambiguous, correctly. Dropped the bogus "Seth Tam" row. `npm run seed` now
also clears `web/data/wiki/who/people`, so the folder never shows people who left memory or old
spellings of people who did not.

**Evidence, all fresh after the fix:**

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run memory:check` | OK |
| `npm run backend:check` | exit 0, 7.8 s end to end |
| Beat one (first name only) | Prashant → RenderWolf AI · Dhravya → Supermemory · Callahan → Prairie Labs · Christian → Meerkatt AI |
| Beat two (kill research) | `health.enrichment=killed`, next card still landed |
| Voice path | `/api/session` → `openai: true` |
| Memory health | `ok` |

**Known going in:** the model path runs 7–8 s per turn (was ~5), so the card lands a beat late; the
browser's output-idle gate means it reads as a late whisper, not a stall. Reseeded to a clean
8-teammate ledger with the wiki cleared, so memory fills live on camera.

Repo `main` @ `2b3bcf6`-era + the roster fix, graph mirrored @ `cb6fb0a`, roster 82/79, dev server
left running in tmux `mmg`.
