/**
 * Mentra Live camera, annotated. The glasses publish RTMP to MediaMTX on the
 * laptop; the vision sidecar (vision/server.py) pulls it, draws face boxes with
 * names, and pushes JPEG frames plus the face list over WebSocket. That
 * annotated frame is the one source of truth: shown here, and sent to the
 * delegation vision model via `snapshot`.
 */
export type SeenFace = { person_id: string | null; name: string | null; score: number; box: [number, number, number, number] };

export type GlassesCamera = {
  /** Latest annotated frame as a JPEG data URL, for GptLiveClient's `snapshot` seam. */
  snapshot: () => Promise<string | undefined>;
  close: () => void;
};

export function openGlassesCamera(
  wsUrl: string,
  img: HTMLImageElement,
  on: { status: (text: string) => void; faces?: (faces: SeenFace[]) => void },
): GlassesCamera {
  let latest: Uint8Array | undefined;
  let lastAt = 0;
  const ring: Uint8Array[] = [];
  let ringAt = 0;
  let objectUrl: string | undefined;
  let shown = "";
  const report = (text: string) => { if (text !== shown) { shown = text; on.status(text); } };
  const sock = new WebSocket(wsUrl);
  sock.binaryType = "arraybuffer";
  sock.onopen = () => report("camera live");
  sock.onclose = () => report("camera closed");
  sock.onerror = () => report(`cannot reach ${wsUrl}`);
  sock.onmessage = (e) => {
    if (typeof e.data === "string") {
      const msg: unknown = JSON.parse(e.data);
      if (msg && typeof msg === "object" && "faces" in msg && Array.isArray(msg.faces)) on.faces?.(msg.faces as SeenFace[]);
      return;
    }
    const buffer = e.data as ArrayBuffer;
    latest = new Uint8Array(buffer);
    lastAt = Date.now();
    // Keep a short trail of frames (one every ~700 ms, last ~3 s): the delegation snapshot stitches
    // them into one sheet, so a face that turned away at the exact delegation moment is still in view.
    if (Date.now() - ringAt >= 700) { ringAt = Date.now(); ring.push(latest); if (ring.length > 4) ring.shift(); }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(new Blob([buffer], { type: "image/jpeg" }));
    img.src = objectUrl;
  };
  // A stalled glasses publish makes the socket go quiet, not close. Say so in the status line.
  const watchdog = window.setInterval(() => {
    if (!lastAt) return;
    const age = (Date.now() - lastAt) / 1000;
    report(age > 2 ? `camera stalled ${age.toFixed(0)}s` : "camera live");
  }, 1000);
  return {
    snapshot: () => contactSheet(ring.length ? ring : latest ? [latest] : []),
    close: () => { window.clearInterval(watchdog); sock.close(); if (objectUrl) URL.revokeObjectURL(objectUrl); img.removeAttribute("src"); },
  };
}

/** 2x2 sheet of the given JPEG frames (newest bottom-right), one JPEG data URL. One frame passes through untouched. */
async function contactSheet(frames: Uint8Array[]): Promise<string | undefined> {
  if (!frames.length) return undefined;
  if (frames.length === 1) return `data:image/jpeg;base64,${toBase64(frames[0])}`;
  const bitmaps = await Promise.all(frames.map((f) => createImageBitmap(new Blob([f.slice().buffer as ArrayBuffer], { type: "image/jpeg" }))));
  const w = 640, h = Math.round((640 * bitmaps[0].height) / bitmaps[0].width);
  const canvas = document.createElement("canvas");
  canvas.width = w * 2; canvas.height = h * 2;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  bitmaps.forEach((b, i) => { ctx.drawImage(b, (i % 2) * w, Math.floor(i / 2) * h, w, h); b.close(); });
  return canvas.toDataURL("image/jpeg", 0.7);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
