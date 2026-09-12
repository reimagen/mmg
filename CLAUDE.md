# CLAUDE.md

Same contract as [`AGENTS.md`](./AGENTS.md). Ranked plan: [`docs/SHIP.md`](./docs/SHIP.md).

- Lisa = GPT Live / Mac. Jake = memory + Exa write-back. Luis = whisper-card UI. Saint = Mentra Live (`client/mentra`, P2).
- Live agent is **Mac**. Talk / Hang up on `/`. Client delegation. No video on Live.
- P0 remaining: name first/last (Lisa), Exa on card (Jake), tape (Luis+Lisa).
- Memory is in-process SQLite behind `@/lib/memory`. Never await Exa or Hermes on the live path.
- Hermes/hall is P1 (`docs/HERMES.md`). Off until `HERMES_ENABLED=1` *and* hall is up.
- Second-pass recognition and Auth0 are skip / stretch.
- Secrets in `web/.env.local`. Do not commit `.env`.
