#!/usr/bin/env bash
# Probe P0 on :3000 (memory is in-process SQLite — no :7777). Never prints secrets.
set -euo pipefail
fail=0
for path in /api/health /api/memory/people; do
  if curl -sf "http://127.0.0.1:3000$path" >/dev/null; then echo "GET $path ok"; else echo "GET $path FAIL" >&2; fail=1; fi
done
if sess="$(curl -sf http://127.0.0.1:3000/api/session)"; then
  case "$sess" in *'"openai":true'*) echo "GET /api/session openai=true";; *) echo "GET /api/session openai=false (set OPENAI_API_KEY in web/.env.local)";; esac
else
  echo "GET /api/session FAIL" >&2; fail=1
fi
exit $fail
