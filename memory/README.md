# memory/ — the people-memory system

**Live code is in `web/src/lib/memory/`** (SQLite in-process via `node:sqlite`, D17).
Read [`HANDOFF.md`](./HANDOFF.md) — per-person notes, curls, the exit gate.

```sh
cd web && npm run seed          # wipe + load the demo cast → web/data/memory.db
cd web && npm run memory:check  # self-check
```

HTTP surface (glasses / Hermes / UI): `POST /api/memory/{upsert,recall,log,brief}`,
`GET /api/memory/people`. Rollback to the JSON stub: `MEMORY_BACKEND=json`.

`legacy/` = the retired Python FastAPI `:7777` sidecar (schema + seed ported). Not run.
