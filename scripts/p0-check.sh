#!/usr/bin/env bash
# Probe P0 sidecars. Memory down → non-zero. Never prints secrets.
set -euo pipefail

memory_down=0

if curl -sf http://127.0.0.1:7777/people >/dev/null; then
  echo "GET /people ok"
else
  echo "GET /people FAIL — memory down on :7777" >&2
  memory_down=1
fi

if curl -sf "http://127.0.0.1:7777/recall?name=Jake" >/dev/null; then
  echo "GET /recall?name=Jake ok"
else
  echo "GET /recall?name=Jake FAIL" >&2
  memory_down=1
fi

if [ "$memory_down" -ne 0 ]; then
  exit 1
fi

if curl -sf http://127.0.0.1:3000/api/health >/dev/null; then
  echo "GET /api/health ok"
  if sess="$(curl -sf http://127.0.0.1:3000/api/session)"; then
    if command -v python >/dev/null 2>&1; then PY=python; else PY=python3; fi
    openai="$(printf '%s' "$sess" | "$PY" -c 'import json,sys; print("true" if json.load(sys.stdin).get("openai") is True else "false")')"
    echo "GET /api/session openai=${openai}"
  else
    echo "GET /api/session FAIL" >&2
  fi
else
  echo "Next :3000 not up — skipped /api/health and /api/session"
fi
