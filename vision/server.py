"""Vision sidecar: faces on the glasses stream, on the M3.

camera -> MediaMTX (RTSP) -> SCRFD detect + ArcFace embed (CoreML) -> match
against enrolled people -> annotated JPEG + face list over WebSocket. The
annotated frame is the one source of truth: the browser shows it and the
delegation vision model reads it. Enrollment links the largest face in view
to a person id (auto on spoken name, per Saint 2026-09-12).

Run: uv run python server.py   (port 8791)
"""
from __future__ import annotations

import asyncio
import json
import os
import threading
import time
from pathlib import Path

# Must be set before cv2 loads: no decoder buffering, drop late packets, TCP so frames arrive whole.
# timeout is the RTSP socket I/O limit (µs): a stalled publisher makes read() fail in 5 s instead of hanging forever.
os.environ.setdefault("OPENCV_FFMPEG_CAPTURE_OPTIONS", "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay|max_delay;0|reorder_queue_size;0|timeout;5000000")

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from insightface.app import FaceAnalysis
from pydantic import BaseModel

SOURCE = "rtsp://127.0.0.1:8554/live/mentra-live"
PORT = 8791
FACES_PATH = Path(__file__).parent / "data" / "faces.json"
MATCH_MIN = 0.45          # cosine; probe: same person 0.90, strangers < 0.08
RUNNER_UP_MARGIN = 0.05   # cat-turret gate: reject if the second best is this close
DET_SIZE = (640, 640)
JPEG_QUALITY = 80
GREEN, BLUE, YELLOW = (60, 200, 60), (230, 120, 20), (0, 200, 255)

app = FastAPI()
engine = FaceAnalysis(name="buffalo_l", providers=["CoreMLExecutionProvider", "CPUExecutionProvider"], allowed_modules=["detection", "recognition"])
engine.prepare(ctx_id=0, det_size=DET_SIZE)


class Gallery:
    """Enrolled people: person_id -> {name, embedding}. One embedding per person for now (ponytail: average more samples later)."""

    def __init__(self, path: Path):
        self.path = path
        self.people: dict[str, dict] = json.loads(path.read_text()) if path.exists() else {}
        self._rebuild()

    def _rebuild(self):
        self.ids = list(self.people)
        self.matrix = np.array([self.people[i]["embedding"] for i in self.ids], dtype=np.float32) if self.ids else np.zeros((0, 512), np.float32)

    def enroll(self, person_id: str, name: str, embedding: np.ndarray):
        self.people[person_id] = {"name": name, "embedding": embedding.astype(float).tolist(), "at": time.time()}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.people))
        self._rebuild()

    def match(self, embedding: np.ndarray) -> tuple[str | None, float]:
        if not self.ids:
            return None, 0.0
        scores = self.matrix @ embedding
        order = np.argsort(-scores)
        best, score = self.ids[order[0]], float(scores[order[0]])
        if score < MATCH_MIN:
            return None, score
        if len(order) > 1 and score - float(scores[order[1]]) < RUNNER_UP_MARGIN:
            return None, score
        return best, score


gallery = Gallery(FACES_PATH)


class Latest:
    """Shared between the capture thread, the detect thread, and the HTTP/WS handlers."""

    def __init__(self):
        self.lock = threading.Lock()
        self.raw: np.ndarray | None = None
        self.raw_seq = 0
        self.jpeg: bytes | None = None
        self.faces: list[dict] = []
        self.embeddings: list[np.ndarray] = []
        self.seq = 0
        self.fps = 0.0
        self.infer_ms = 0.0
        self.source_ok = False
        self.raw_at = 0.0
        self.reconnects = 0


latest = Latest()


def capture_loop():
    while True:
        cap = cv2.VideoCapture(SOURCE, cv2.CAP_FFMPEG)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        if not cap.isOpened():
            with latest.lock:
                latest.source_ok = False
            time.sleep(2)
            continue
        with latest.lock:
            latest.source_ok = True
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            with latest.lock:
                latest.raw = frame
                latest.raw_seq += 1
                latest.raw_at = time.time()
        cap.release()
        with latest.lock:
            latest.source_ok = False
            latest.reconnects += 1


def detect_loop():
    seen = -1
    tick = time.perf_counter()
    count = 0
    while True:
        with latest.lock:
            frame, seq = latest.raw, latest.raw_seq
        if frame is None or seq == seen:
            time.sleep(0.005)
            continue
        seen = seq
        t0 = time.perf_counter()
        found = engine.get(frame)
        infer_ms = (time.perf_counter() - t0) * 1000
        found.sort(key=lambda f: -(f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
        faces, embeddings = [], []
        annotated = frame.copy()
        for f in found:
            person_id, score = gallery.match(f.normed_embedding)
            name = gallery.people[person_id]["name"] if person_id else None
            x1, y1, x2, y2 = [int(v) for v in f.bbox]
            color = BLUE if person_id else GREEN
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label = name or "unknown"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 10), (x1 + tw + 8, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 4, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            faces.append({"person_id": person_id, "name": name, "score": round(score, 3), "box": [x1, y1, x2, y2], "det": round(float(f.det_score), 2)})
            embeddings.append(f.normed_embedding)
        ok, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        count += 1
        now = time.perf_counter()
        with latest.lock:
            latest.jpeg = buf.tobytes() if ok else latest.jpeg
            latest.faces = faces
            latest.embeddings = embeddings
            latest.seq += 1
            latest.infer_ms = infer_ms
            if now - tick >= 1:
                latest.fps = count / (now - tick)
                tick, count = now, 0


threading.Thread(target=capture_loop, daemon=True).start()
threading.Thread(target=detect_loop, daemon=True).start()


class EnrollRequest(BaseModel):
    person_id: str
    name: str


@app.get("/status")
def status():
    with latest.lock:
        age = round(time.time() - latest.raw_at, 1) if latest.raw_at else None
        return {"source": SOURCE, "source_ok": latest.source_ok, "frame_age_s": age, "reconnects": latest.reconnects, "fps": round(latest.fps, 1), "infer_ms": round(latest.infer_ms, 1), "enrolled": len(gallery.ids), "faces": len(latest.faces)}


@app.get("/faces")
def faces():
    with latest.lock:
        return {"seq": latest.seq, "faces": latest.faces}


@app.post("/enroll")
def enroll(req: EnrollRequest):
    with latest.lock:
        if not latest.embeddings:
            return JSONResponse({"ok": False, "error": "no face in view"}, status_code=409)
        embedding = latest.embeddings[0]
        box = latest.faces[0]["box"]
    gallery.enroll(req.person_id, req.name, embedding)
    return {"ok": True, "person_id": req.person_id, "name": req.name, "box": box}


@app.websocket("/ws")
async def ws(sock: WebSocket):
    await sock.accept()
    sent = -1
    try:
        while True:
            with latest.lock:
                seq, jpeg, faces = latest.seq, latest.jpeg, latest.faces
            if seq == sent or jpeg is None:
                await asyncio.sleep(0.01)
                continue
            sent = seq
            await sock.send_text(json.dumps({"seq": seq, "faces": faces}))
            await sock.send_bytes(jpeg)
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="warning")
