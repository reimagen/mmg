# Decisions — locked (don't reopen mid-build)

| # | Decision | When |
|---|---|---|
| D1 | Concept: **wearable social copilot** — Mentra Live glasses → GPT Live; remembers people, whispers context cards, coach + roast-me modes; demo = networking event | team mtg 10:52 |
| D2 | Models: **OpenAI + OpenRouter** (+ Oxen.ai third pool via Greg) | team mtg |
| D3 | Live search/validation: **Exa** | team mtg |
| D4 | **No CopilotKit / TriggerDev / Mozilla** — complexity without payoff in 6h | team mtg |
| D5 | Team name **MMG**; project tentatively "GPT Live MMG"; repo `reimagen/mmg` (public) | team mtg + chat |
| D6 | Roles per [[../who/team]] — four core lanes + three floaters | PRD v2 |
| D7 | Privacy guardrail: face recognition on **enrolled, consenting demo participants only**; strangers get audio-name capture | PRD |
| D8 | Glasses = **Mentra Live / MentraOS** (chat 11:16–11:17; supersedes "Meta glasses" from the meeting note) | chat |
| D9 | **Adopt Bootoshi's hall** (chief-of-staff architecture) as the voice↔agents bridge: GPT Live = voice agent (send/stop + WS + verbatim-speak), async agents = hall rooms w/ 5-field packets; memory API stays a direct sidecar (fast plane) | chat 11:30–31 |
| D10 | Channel renamed **MMG**; GitHub handles: jakejjoyner · kingbootoshi; staging repo `jakejjoyner/mmg` until Lisa adds collaborators | chat 11:30–38 |
| D11 | **Client delegation**, not Responses delegation (no tools on the live model; `/api/delegate` runs `runMemoryTool`) | Lisa's push 11:58 |
| D12 | **Browser mic is the environment**; glasses are optional/P2. Video starts on browser, cuts to HUD only if Saint is live | SHIP.md 12:12 |
| D13 | **Demo = bank + research.** Second-pass recognition, re-encounter, face lock, roast beat = stretch; face-ref `recall` is P2 | SHIP.md 12:12 |
| D14 | Hermes/hall is **P1**, `HERMES_ENABLED=0` default; flip on only if hall `:8768` is already running. Local Exa queue is the ship path (refines D9) | HERMES.md 12:12 |
| D15 | No Auth0 / login; one local operator. Secrets in `web/.env.local` only | SHIP.md 12:12 |
| D16 | Rehearse **one** failure beat on tape (kill enrichment or no-glasses); quota→OpenRouter→Oxen only if quota actually dies | SHIP/ARCHITECTURE 12:12 |
| D17 | **(accepted 12:45, "continue the campaign")** Memory = SQLite in-process behind Lisa's `@/lib/memory` seam via `node:sqlite`; same five sync signatures, `MEMORY_BACKEND=json` rollback; Python `:7777` retired to `memory/legacy/`; HTTP surface = existing `/api/memory/*` | campaign rescope 12:55 |
| D18 | Research facts are processed, not dumped: name gate, ≤2 per run, URL in text, `source: exa` | arch v1 13:05 |
| D19 | `brief` = ranked template (live > enrollment > manual > exa > treg, newest first), ≤220 chars, never an LLM call | arch v1 |
| D20 | Transcript text never persisted — `transcript_ref` only (governed tier) | arch v1 |
| D21 | Loopback only, no auth; LAN reach for glasses via `NEXT_PUBLIC_MMG_API_URL` is Saint's P2 | arch v1 |
| D22 | **Context system = opt-in LLM delegation backend** (`BACKEND_LLM=1`, `web/src/lib/context/backend.ts`, Responses API tool loop over Lisa's `BACKEND_TOOLS`); default OFF so Lisa's regex demo is untouched; any error → regex fallback. On the model path the *card* is composed by the model from banked facts (D19's template `brief` stays the tool + fallback) | Jake 13:12 "go ahead with the backend + context system" |
| D23 | **Memory has an LLM-Wiki projection in aDNA form**: every write renders `web/data/wiki/{CLAUDE.md, who/people/<name>.md, who/people/index.md}`; the backend's system prompt embeds the person-in-focus's page (page in, page out). SQLite stays the store; the wiki is the showcase + the model's context packet | Jake 13:12 "aDNA wired in / LLM-Wiki paradigm" |
| D24 | **RESOLVED 13:25 (Jake: "best database for a project of this scale"): SQLite in-process is the one backend.** `sidecar.ts` + `p0-up.sh` → `memory/legacy/`; docs branch rebased + merged (main @e76c271); `p0-check.sh` probes `:3000` only. `MEMORY_BACKEND=json` remains the only rollback | Jake 13:25 |
| D25 | **Detection layer is heuristic and always-on** (`web/src/lib/memory/detect.ts`): every turn yields `Signal[]` (name incl. surname · role · company/project · commitment · ask · contact · correction) regardless of backend. The model refines; heuristics are the floor and the fallback. Signals are fed INTO the model prompt so it banks rather than re-derives | Jake 13:30 "more features for detection from processing" |
| D26 | **A single-word name is not an identity.** Research banks a fact only if the result corroborates with something the person said (company/project); full names stand alone. Wrong-person facts are worse than no facts; honest skips are the scored failure beat | III finding, live Exa test returned two unrelated Jakes |
| D27 | **`Fact` carries an optional `url`** (additive to the shared contract) so a researched line is traceable to its source. Research text is tidied of markdown before it can reach a card | Jake 13:40 "tell us where it came from" |
| D28 | **The backend is presented through `GET /api/runtime`, not through UI we write.** It returns backend kind/model/store, health, counts, research jobs, the last 12 delegation traces (heard · signals · tools · ms) and the focus person's wiki page. Jake 13:50: the UI is Luis's lane — our edits to `page.tsx` were reverted and the III findings handed over as notes | Jake 13:50 |
