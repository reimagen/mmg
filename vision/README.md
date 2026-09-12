# vision - faces on the glasses stream (Saint)

Status 2026-09-12: **live on the M3**. 40 ms per frame on CoreML, ~11 fps end to end.

Camera -> MediaMTX (RTSP) -> SCRFD detect + ArcFace embed -> match -> annotated JPEG + face list over WebSocket.
The annotated frame is the one source of truth: the browser shows it, and the delegation vision model reads it.

## Run

```bash
cd vision && uv run python server.py   # port 8791
```

Needs MediaMTX on the laptop with the glasses publishing to `live/mentra-live`.
Test without glasses: `ffmpeg -re -loop 1 -i photo.jpg -vf scale=1280:-2 -r 15 -c:v libx264 -preset ultrafast -tune zerolatency -pix_fmt yuv420p -g 30 -f flv rtmp://127.0.0.1:1935/live/mentra-live`

## API

- `GET /status` - source ok, fps, infer ms, enrolled count.
- `GET /faces` - faces in the latest frame: `{person_id, name, score, box, det}`; largest first.
- `POST /enroll {person_id, name}` - link the largest face in view to that person. Box turns blue at once. 409 when no face.
- `WS /ws` - per frame: a JSON text message `{seq, faces}` then the annotated JPEG as binary.

## How the web side uses it (`web/src/lib/live/faces.ts`)

- Spoken "nice to meet you, NAME" in a delegation -> memory creates the person -> `POST /enroll` with their id, and memory gets `face_ref = face:<id>`, `enrolled = true`. Auto-link, no confirm step (Saint, 2026-09-12).
- Every delegation first asks `GET /faces`; a recognized face fills `face_ref` so the person resolves with no name spoken.
- `web/src/lib/live/vision.ts` sends the annotated frame to `gpt-5.6-luna` (Responses API, low reasoning, ~3 s); its text is appended to `thinking` as `Seen: ...`. gpt-live-1 takes no images itself.

## Gate

Cosine >= 0.45 and runner-up at least 0.05 behind (cat-turret's rule). Probe on a real photo: same person 0.90, strangers under 0.08.

## Ceilings

- One embedding per person, taken at enroll. ponytail: average more samples over time for odd angles.
- Gallery is `data/faces.json`; person ids come from web memory. Delete the file to reset.
- Frames are pulled at whatever MediaMTX delivers; detect drops frames when behind, never queues.
