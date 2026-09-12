#!/bin/sh
# Dev telemetry for the glasses camera path, once a second, one terminal:
#   sidecar: frame age, fps, inference, reconnects   (vision/server.py :8791)
#   relay:   phones, mic bytes, last phone STREAM/PHONE events (relay :8790)
# Run: sh vision/telemetry.sh
while true; do
  clear
  date '+%H:%M:%S'
  printf 'sidecar  '; curl -s -m 1 http://127.0.0.1:8791/status | jq -c '{source_ok, frame_age_s, fps, infer_ms, reconnects, faces, enrolled}' || echo down
  printf 'relay    '; curl -s -m 1 http://127.0.0.1:8790/status | jq -c . || echo down
  echo '--- phone events (newest last)'
  curl -s -m 1 http://127.0.0.1:8790/events | jq -r '.[-12:][] | "\(.at/1000 | strflocaltime("%H:%M:%S")) \(.tag) \(.message)"'
  sleep 1
done
