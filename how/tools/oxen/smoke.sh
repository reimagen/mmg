#!/usr/bin/env bash
# One chat completion against Oxen. Usage: ./smoke.sh [model] [prompt]
# Needs OXEN_API_KEY in the env (source oxen.sh first).
set -euo pipefail

MODEL="${1:-deepseek-v4-1-flash}"
PROMPT="${2:-Reply with exactly: oxen wired}"
BASE="${OXEN_BASE_URL:-https://hub.oxen.ai/api/ai}"
: "${OXEN_API_KEY:?set OXEN_API_KEY first (source oxen.sh)}"

# key goes in via a stdin curl config, never argv (/proc/*/cmdline is world-readable)
resp=$(printf 'header = "authorization: Bearer %s"\n' "$OXEN_API_KEY" | curl -sS \
  --config - \
  -H 'content-type: application/json' \
  -w '\n%{http_code}' \
  "$BASE/chat/completions" \
  -d "$(MODEL="$MODEL" PROMPT="$PROMPT" python3 -c '
import json, os
print(json.dumps({"model": os.environ["MODEL"],
                  "messages": [{"role": "user", "content": os.environ["PROMPT"]}],
                  "max_tokens": 64}))')")

code=${resp##*$'\n'}
body=${resp%$'\n'*}

echo "HTTP $code  model=$MODEL"
if [ "$code" = 200 ]; then
  printf '%s' "$body" | python3 -c '
import json, sys
d = json.load(sys.stdin)
print("reply:", d["choices"][0]["message"]["content"].strip())
print("usage:", d.get("usage"))'
else
  printf 'ERROR: %s\n' "$body"
  exit 1
fi
