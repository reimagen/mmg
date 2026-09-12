# CLAUDE.md

Same contract as [`AGENTS.md`](./AGENTS.md). Directives: [`docs/SHIP.md`](./docs/SHIP.md).
Scoring: [`docs/SCORING.md`](./docs/SCORING.md) — target **5 on all four**.

- Lisa = GPT Live / Mac. Jake = memory + Exa write-back. Luis = whisper-card UI. Saint = Mentra Live (`client/mentra`, P2).
- Live agent is **Mac**. Talk / Hang up on `/`. Client delegation. No video on Live.
- Lisa now: first+last enroll via Jake `detect`, then tape.
- Memory is in-process SQLite behind `@/lib/memory`. Never await Exa or Hermes on the live path.
- Hermes is a time ripcord (`docs/HERMES.md`). Leave `HERMES_ENABLED=0`. Pull it (skip hall) if the clock is tight.
- Re-encounter (spoken name) is on the tape for C4=5. Face-rec and Auth0 are skip.
- Secrets in `web/.env.local`. Do not commit `.env`.
