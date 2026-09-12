"""Probe: InsightFace (SCRFD + ArcFace buffalo_l) on one photo, CoreML vs CPU timing,
self-match vs cross-match cosine. Run: uv run python probe.py <image>"""
import sys
import time

import cv2
import numpy as np
from insightface.app import FaceAnalysis

img = cv2.imread(sys.argv[1])
scale = 1280 / max(img.shape[:2])
frame = cv2.resize(img, None, fx=scale, fy=scale) if scale < 1 else img
print("frame", frame.shape)

for providers in (["CoreMLExecutionProvider", "CPUExecutionProvider"], ["CPUExecutionProvider"]):
    app = FaceAnalysis(name="buffalo_l", providers=providers, allowed_modules=["detection", "recognition"])
    app.prepare(ctx_id=0, det_size=(640, 640))
    app.get(frame)
    t = time.perf_counter()
    for _ in range(5):
        faces = app.get(frame)
    dt = (time.perf_counter() - t) / 5
    print(f"{providers[0]}: {len(faces)} faces, {dt * 1000:.0f} ms/frame")

faces = sorted(faces, key=lambda f: -(f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
for i, f in enumerate(faces):
    x1, y1, x2, y2 = f.bbox.astype(int)
    print(f"face {i}: box=({x1},{y1},{x2},{y2}) w={x2 - x1} det={f.det_score:.2f}")
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
    cv2.putText(frame, f"{i}", (x1, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
cv2.imwrite("/tmp/probe-boxes.jpg", frame)

emb = [f.normed_embedding for f in faces]
if len(emb) >= 2:
    print("cross-match cosine (different people, should be < 0.3):")
    for i in range(len(emb)):
        for j in range(i + 1, len(emb)):
            print(f"  {i} vs {j}: {float(np.dot(emb[i], emb[j])):.3f}")

# Self-match: re-embed the biggest face from a flipped + slightly cropped frame.
big = faces[0]
x1, y1, x2, y2 = big.bbox.astype(int)
pad = int((x2 - x1) * 0.6)
crop = frame[max(0, y1 - pad):y2 + pad, max(0, x1 - pad):x2 + pad]
variant = cv2.flip(crop, 1)
again = app.get(variant)
if again:
    print(f"self-match cosine (same person, flipped crop, should be > 0.5): {float(np.dot(emb[0], again[0].normed_embedding)):.3f}")
else:
    print("self-match: no face found in variant")
