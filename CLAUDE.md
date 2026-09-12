# CLAUDE.md

Same contract as [`AGENTS.md`](./AGENTS.md). Ranked plan: [`docs/SHIP.md`](./docs/SHIP.md).

- Lisa = GPT Live + Exa. Luis = whisper-card UI. Jake = `memory/`. Saint = glasses (P2).
- Client delegation. No video on Live. Browser mic is the environment.
- P0: bank the record (`upsert`/`log`/`brief`) + killable Exa research.
- Memory `:7777` is local-only. Never await Exa or Hermes on the live path.
- Hermes/hall is P1 (`docs/HERMES.md`). Off until `HERMES_ENABLED=1` *and* hall is up.
- Second-pass recognition and Auth0 are skip / stretch.
- Secrets in `web/.env.local`. Do not commit `.env`.
