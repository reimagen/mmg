#!/bin/sh
# MMG glasses demo, Mac side. One command for everything.
#   sh demo.sh up       start all five (mediamtx, relay, vision, web, metro); safe to re-run
#   sh demo.sh down     stop all five
#   sh demo.sh status   what is running, ports, glasses stream health
#   sh demo.sh logs X   tail a log: mediamtx | relay | vision | web | metro
#   sh demo.sh reset    wipe memory + face gallery (fresh demo)
# Logs live in /tmp/mmg/*.log. Needs: brew mediamtx, bun, uv, node, sv (OPENAI_API_KEY, EXA_API_KEY in the vault).
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
KIT="$HOME/Dev/mentra-bt-kit/examples/react-native"
LOGS=/tmp/mmg; mkdir -p "$LOGS"
IP=$(ipconfig getifaddr en0 2>/dev/null || echo 127.0.0.1)

up_one() { # name, cwd, command...
  name=$1; dir=$2; shift 2
  if [ -f "$LOGS/$name.pid" ] && kill -0 "$(cat "$LOGS/$name.pid")" 2>/dev/null; then echo "$name: already running"; return; fi
  (cd "$dir" && nohup "$@" >"$LOGS/$name.log" 2>&1 & echo $! >"$LOGS/$name.pid")
  echo "$name: started (log $LOGS/$name.log)"
}
down_one() {
  name=$1
  if [ -f "$LOGS/$name.pid" ]; then pkill -P "$(cat "$LOGS/$name.pid")" 2>/dev/null; kill "$(cat "$LOGS/$name.pid")" 2>/dev/null; rm -f "$LOGS/$name.pid"; echo "$name: stopped"; fi
}

case "${1:-status}" in
  up)
    up_one mediamtx "$ROOT" /opt/homebrew/opt/mediamtx/bin/mediamtx /opt/homebrew/etc/mediamtx/mediamtx.yml
    up_one relay    "$ROOT/client/mentra/relay" bun server.ts
    up_one vision   "$ROOT/vision" uv run python server.py
    up_one web      "$ROOT/web" env MEMORY_API_URL=http://127.0.0.1:7777 HERMES_ENABLED=0 BACKEND_LLM=1 BACKEND_MODEL=gpt-5.6-luna sv run OPENAI_API_KEY,EXA_API_KEY -- npm run dev
    up_one metro    "$KIT" bunx expo start --dev-client --offline
    echo
    echo "phone relay URL:  ws://$IP:8790/glasses"
    echo "phone metro URL:  http://$IP:8081"
    echo "browser:          http://localhost:3000/glasses"
    ;;
  down) for n in metro web vision relay mediamtx; do down_one $n; done ;;
  status)
    for n in mediamtx relay vision web metro; do
      if [ -f "$LOGS/$n.pid" ] && kill -0 "$(cat "$LOGS/$n.pid")" 2>/dev/null; then echo "$n: up"; else echo "$n: DOWN"; fi
    done
    printf 'vision: '; curl -s -m 1 http://127.0.0.1:8791/status || echo unreachable; echo
    printf 'relay:  '; curl -s -m 1 http://127.0.0.1:8790/status || echo unreachable; echo
    echo "phone relay URL: ws://$IP:8790/glasses"
    ;;
  logs) tail -n 60 -f "$LOGS/${2:?name}.log" ;;
  reset)
    trash "$ROOT/vision/data/faces.json" "$ROOT/web/data/memory.db" 2>/dev/null || true
    echo "memory and face gallery wiped; run: sh demo.sh down && sh demo.sh up"
    ;;
  *) echo "usage: sh demo.sh up|down|status|logs <name>|reset"; exit 1 ;;
esac
