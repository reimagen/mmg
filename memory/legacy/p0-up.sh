#!/usr/bin/env bash
# Start the memory sidecar for P0. Does not start Next (Lisa may already own :3000).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PEOPLE_URL="http://127.0.0.1:7777/people"
if command -v python >/dev/null 2>&1; then
  PYTHON=python
else
  PYTHON=python3
fi

already_serving() {
  curl -sf "$PEOPLE_URL" >/dev/null
}

if already_serving; then
  echo "memory already serving on :7777 — skipped seed and uvicorn"
else
  "$PYTHON" -m memory.seed
  if command -v uvicorn >/dev/null 2>&1; then
    uvicorn memory.api:app --host 127.0.0.1 --port 7777 \
      >/tmp/mmg-memory-7777.log 2>&1 &
  else
    "$PYTHON" -m uvicorn memory.api:app --host 127.0.0.1 --port 7777 \
      >/tmp/mmg-memory-7777.log 2>&1 &
  fi
  echo "started memory sidecar pid $!"
fi

ready=0
for _ in $(seq 1 20); do
  if already_serving; then
    ready=1
    break
  fi
  sleep 0.5
done

if [ "$ready" -ne 1 ]; then
  echo "memory did not answer GET /people within 10s" >&2
  exit 1
fi

echo "memory ready: GET $PEOPLE_URL"
echo "Start Next separately (do not fight an existing :3000):"
echo "  cd web && npm run dev"
