// Mentra glasses relay. Phone app (Bluetooth SDK) pushes 16 kHz PCM16 mono
// frames over /glasses; every browser on /ui hears them live. Text typed in
// the browser becomes a WAV (macOS `say`) pushed back to the phone, which
// plays it out through the glasses' Bluetooth audio route.
import { networkInterfaces } from "node:os";
import type { ServerWebSocket } from "bun";

type Role = "glasses" | "ui";
type Sock = ServerWebSocket<{ role: Role }>;

const PORT = Number(process.env.PORT ?? 8790);
const phones = new Set<Sock>();
const uis = new Set<Sock>();
let pcmBytes = 0;
let micLevel = 0;
let lastPcmAt = 0;

/** RMS of a 16-bit mono PCM frame, 0..1: the "is the mic actually hearing anything" number. */
const rms = (buf: Uint8Array | ArrayBuffer) => {
  const view = buf instanceof ArrayBuffer ? new Int16Array(buf) : new Int16Array(buf.buffer, buf.byteOffset, buf.byteLength >> 1);
  let sum = 0;
  for (let i = 0; i < view.length; i++) sum += (view[i] / 32768) ** 2;
  return view.length ? Math.sqrt(sum / view.length) : 0;
};

// The glasses' RTMP publish can stall with the phone none the wiser (no stream_status). The sidecar sees it as frame age;
// nudge the phone to restart the camera, at most once per 20 s.
const VISION_URL = process.env.VISION_URL ?? "http://127.0.0.1:8791";
let lastNudge = 0;
setInterval(async () => {
  if (phones.size === 0 || Date.now() - lastNudge < 20_000) return;
  const s = await fetch(`${VISION_URL}/status`, { signal: AbortSignal.timeout(1000) }).then((r) => r.json() as Promise<{ frame_age_s: number | null; source_ok: boolean }>).catch(() => undefined);
  if (!s || s.frame_age_s === null || s.frame_age_s < 8) return;
  lastNudge = Date.now();
  event("STREAM", `no frames for ${s.frame_age_s}s -> asking phone to restart camera`);
  broadcast(phones, JSON.stringify({ type: "camera_restart" }));
}, 3000);

const html = await Bun.file(new URL("./ui.html", import.meta.url)).text();

const broadcast = (set: Set<Sock>, msg: string | Uint8Array) => {
  for (const ws of set) ws.send(msg);
};

const recent: { at: number; tag: string; message: string }[] = [];
const event = (tag: string, message: string) => {
  recent.push({ at: Date.now(), tag, message });
  if (recent.length > 50) recent.shift();
  broadcast(uis, JSON.stringify({ type: "event", at: Date.now(), tag, message }));
};

const speak = async (text: string): Promise<Uint8Array> => {
  const out = `/tmp/mentra-say-${Date.now()}.wav`;
  const proc = Bun.spawn(["say", "-o", out, "--data-format=LEI16@16000", text]);
  if ((await proc.exited) !== 0) throw new Error("say failed");
  return new Uint8Array(await Bun.file(out).arrayBuffer());
};

Bun.serve<{ role: Role }>({
  port: PORT,
  hostname: "0.0.0.0",
  async fetch(req, server) {
    const url = new URL(req.url);
    const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "content-type" };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (url.pathname === "/glasses") return server.upgrade(req, { data: { role: "glasses" } }) ? undefined : new Response("upgrade failed", { status: 400 });
    if (url.pathname === "/ui") return server.upgrade(req, { data: { role: "ui" } }) ? undefined : new Response("upgrade failed", { status: 400 });
    if (url.pathname === "/say" && req.method === "POST") {
      const { text } = (await req.json()) as { text?: string };
      if (!text?.trim()) return Response.json({ ok: false, error: "text required" }, { status: 422, headers: cors });
      if (phones.size === 0) return Response.json({ ok: false, error: "no phone connected" }, { status: 409, headers: cors });
      const wav = await speak(text.trim());
      broadcast(phones, JSON.stringify({ type: "wav", b64: Buffer.from(wav).toString("base64") }));
      event("SAY", `${wav.byteLength} bytes -> phone: "${text.trim()}"`);
      return Response.json({ ok: true, bytes: wav.byteLength }, { headers: cors });
    }
    if (url.pathname === "/wav" && req.method === "POST") {
      const wav = new Uint8Array(await req.arrayBuffer());
      if (wav.byteLength <= 44) return Response.json({ ok: false, error: "wav body required" }, { status: 422, headers: cors });
      if (phones.size === 0) return Response.json({ ok: false, error: "no phone connected" }, { status: 409, headers: cors });
      broadcast(phones, JSON.stringify({ type: "wav", b64: Buffer.from(wav).toString("base64") }));
      event("VOICE", `${wav.byteLength} bytes -> phone`);
      return Response.json({ ok: true, bytes: wav.byteLength }, { headers: cors });
    }
    if (url.pathname === "/status") return Response.json({ phones: phones.size, uis: uis.size, pcmBytes, micLevel: Number(micLevel.toFixed(3)), micAgeMs: lastPcmAt ? Date.now() - lastPcmAt : null }, { headers: cors });
    if (url.pathname === "/events") return Response.json(recent, { headers: cors });
    return new Response(html, { headers: { "content-type": "text/html" } });
  },
  websocket: {
    open(ws) {
      (ws.data.role === "glasses" ? phones : uis).add(ws);
      if (ws.data.role === "glasses") event("PHONE", `connected from ${ws.remoteAddress}`);
      else ws.send(JSON.stringify({ type: "event", at: Date.now(), tag: "UI", message: `phones connected: ${phones.size}` }));
    },
    close(ws) {
      (ws.data.role === "glasses" ? phones : uis).delete(ws);
      if (ws.data.role === "glasses") event("PHONE", "disconnected");
    },
    message(ws, msg) {
      if (ws.data.role !== "glasses") return;
      if (typeof msg === "string") {
        try {
          const j = JSON.parse(msg) as { tag?: string; message?: string };
          event(j.tag ?? "PHONE", j.message ?? msg);
        } catch {
          event("PHONE", msg);
        }
        return;
      }
      pcmBytes += msg.byteLength;
      micLevel = rms(msg);
      lastPcmAt = Date.now();
      broadcast(uis, msg);
    },
  },
});

console.log(`mentra-relay on port ${PORT}`);
for (const a of Object.values(networkInterfaces()).flat()) {
  if (a?.family === "IPv4" && !a.internal) console.log(`  phone -> ws://${a.address}:${PORT}/glasses   browser -> http://${a.address}:${PORT}/`);
}
