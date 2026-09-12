# Judging map — score every criterion in the 2-minute demo

Track 1–5 scores in [`SCORING.md`](./SCORING.md). This page is the run of show.

## 1. Core Requirements & Functionality

**Bar for 5:** robust, reliable, fully functional in the intended environment.

| Demo beat | Proof |
|---|---|
| `Start GPT Live` | Agent runs **in the conversation**, not a chat form. Browser mic is the guaranteed path; glasses HUD is the same agent when present. |
| Whisper card updates live | End-to-end: hear name → `recall`/`brief` → card + speech. |
| No glasses | Do not stall. Input stays `browser`. Same tools, same memory. |

Script line: *“This is the copilot in the room. Glasses if we have them; this panel if we don’t.”*

## 2. Innovation & Theme Alignment

**Bar for 5:** a pattern you could not reproduce as a standalone chatbox.

Chatbox would wait for you to type “who is this?” After the handshake it is already too late.

The environment is the **live conversation** (wearable or browser mic at the event). Memory + sighting/name-capture exist because you cannot stop to prompt. Coach/roast ride the same loop.

Script line: *“You can’t Alt-Tab a chatbot while shaking someone’s hand.”*

## 3. Technical Execution & Integration

**Bar for 5:** exceptional engineering, robust orchestration, thoughtful failure handling.

Named architecture (say this out loud):

**Client delegation + memory sidecar (fast) + hall/Exa queue (slow).**

| Failure | What judges should see |
|---|---|
| Glasses missing / die | Browser mic, no restart of the agent |
| Face miss | “nice to meet you, NAME” enrolls; no stranger face lookup |
| Memory down | Agent keeps talking, card says un-augmented |
| Exa/treg timeout | Skip; next recall may be stale; conversation never waits |
| GPT Live quota | OpenRouter → Oxen (`https://hub.oxen.ai/api`) |
| Hall packet | UI card is verbatim ground truth; voice may paraphrase |

Privacy: enrolled faces only (3–5 people).

## 4. Usefulness & Agentic Experience

**Bar for 5:** context used intelligently, native to the environment, controllable.

| Control | What the wearer/operator gets |
|---|---|
| Whisper card | Name, how you met, one open thread — 2 sentences, no lecture |
| Coach / roast | Same memory, different mouth. Operator toggles. |
| Memory panel | Every person, fact, timestamp — “it remembers so you don’t have to” |
| Consent | Strangers are name-capture only |

The agent **does** recall, enroll, log, brief, and enrich. It does **not** dump a transcript of bystanders.

## 2-minute run of show (hit all four)

0:00 Browser (or glasses) — *criterion 1, environment*  
0:20 Approach / say “Jake” — card whispers schema thread — *criterion 2 + 4*  
0:50 Talk, new fact lands on the card — *agentic, not Q&A*  
1:10 Second enrolled person — instant open thread — *memory*  
1:25 Roast-me — one laugh — *controllable*  
1:40 Kill/skip enrichment or unplug glasses story — *criterion 3*  
1:55 Panel: every fact, timestamped — freeze
