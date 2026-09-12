# memory/ — the people-memory system

Contract: `docs/context_system_scope.md`. Four HTTP tools for the agent loop.

```sh
pip install fastapi uvicorn
python memory/api.py          # self-check (no server)
python -m memory.seed         # load demo cast
uvicorn memory.api:app --port 7777
```

Tools: `GET /recall?face_ref=|name=` · `POST /upsert_person` · `POST /log_interaction` ·
`GET /brief/{person_id}`. Rules: recall/brief are local-only (<150 ms, no LLM); the realtime
loop never awaits the network — enrichment writes back async and upgrades the *next* recall.
