/**
 * Mentra glasses as an audio device for the browser.
 *
 * In:  relay `/ui` WebSocket pushes 16 kHz 16-bit mono PCM frames from the
 *      glasses mic. `openGlassesMic` turns them into a MediaStream, which is
 *      what GptLiveClient (or any WebRTC client) takes as its microphone.
 * Out: `forwardVoiceToGlasses` taps a remote audio track, cuts it into WAV
 *      utterances on silence, and POSTs them to relay `/wav`; the phone plays
 *      them through the glasses.
 */

export const GLASSES_RATE = 16_000;
const FLUSH_SILENCE_MS = 400;
const FLUSH_MAX_MS = 3_000;
const SILENCE_RMS = 0.01;
const MIN_LEAD = 0.05;
const MAX_LEAD = 0.3;

export type GlassesMic = {
  stream: MediaStream;
  close: () => void;
};

export function openGlassesMic(
  relayWsUrl: string,
  on: { status: (text: string) => void; frames?: (count: number) => void },
): GlassesMic {
  const ctx = new AudioContext({ sampleRate: GLASSES_RATE });
  const dest = ctx.createMediaStreamDestination();
  let playhead = ctx.currentTime;
  let frames = 0;
  let lastReport = 0;
  const sock = new WebSocket(relayWsUrl);
  sock.binaryType = "arraybuffer";
  sock.onopen = () => on.status("relay connected");
  sock.onclose = () => on.status("relay closed");
  sock.onerror = () => on.status(`cannot reach ${relayWsUrl}`);
  sock.onmessage = (e) => {
    if (typeof e.data === "string") return;
    const pcm = new Int16Array(e.data as ArrayBuffer);
    const buf = ctx.createBuffer(1, pcm.length, GLASSES_RATE);
    buf.copyToChannel(Float32Array.from(pcm, (s) => s / 32768), 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(dest);
    // Keep at most MAX_LEAD of queued audio: late bursts are dropped forward instead of stacking up as ever-growing delay.
    const now = ctx.currentTime;
    if (playhead < now + MIN_LEAD || playhead > now + MAX_LEAD) playhead = now + MIN_LEAD;
    src.start(playhead);
    playhead += buf.duration;
    frames += 1;
    if (now - lastReport >= 1) {
      lastReport = now;
      on.frames?.(frames);
    }
  };
  return {
    stream: dest.stream,
    close: () => {
      sock.close();
      void ctx.close();
    },
  };
}

export function forwardVoiceToGlasses(track: MediaStreamTrack, relayWsUrl: string): void {
  const wavUrl = relayWsUrl.replace(/^ws/, "http").replace(/\/ui$/, "/wav");
  const ctx = new AudioContext({ sampleRate: GLASSES_RATE });
  const source = ctx.createMediaStreamSource(new MediaStream([track]));
  // ponytail: ScriptProcessorNode is deprecated but needs no worklet file; swap for AudioWorklet if it stutters.
  const tap = ctx.createScriptProcessor(2048, 1, 1);
  let chunks: Int16Array[] = [];
  let samples = 0;
  let quietMs = 0;
  const flush = () => {
    if (samples === 0) return;
    const pcm = new Int16Array(samples);
    let off = 0;
    for (const c of chunks) {
      pcm.set(c, off);
      off += c.length;
    }
    chunks = [];
    samples = 0;
    quietMs = 0;
    void fetch(wavUrl, { method: "POST", body: wav(pcm) });
  };
  tap.onaudioprocess = (e) => {
    const f = e.inputBuffer.getChannelData(0);
    let sum = 0;
    const out = new Int16Array(f.length);
    for (let i = 0; i < f.length; i++) {
      sum += f[i] * f[i];
      out[i] = Math.max(-32768, Math.min(32767, Math.round(f[i] * 32767)));
    }
    const ms = (f.length / GLASSES_RATE) * 1000;
    if (Math.sqrt(sum / f.length) < SILENCE_RMS) {
      quietMs += ms;
      if (samples > 0 && quietMs >= FLUSH_SILENCE_MS) flush();
      return;
    }
    quietMs = 0;
    chunks.push(out);
    samples += out.length;
    if (samples >= (FLUSH_MAX_MS / 1000) * GLASSES_RATE) flush();
  };
  source.connect(tap);
  // A ScriptProcessor only runs when routed to the destination; a zero gain keeps it from playing a second copy of Mac's voice on the laptop speaker.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  tap.connect(mute);
  mute.connect(ctx.destination);
}

function wav(pcm: Int16Array): Blob {
  const header = new DataView(new ArrayBuffer(44));
  const str = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) header.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, "RIFF");
  header.setUint32(4, 36 + pcm.byteLength, true);
  str(8, "WAVE");
  str(12, "fmt ");
  header.setUint32(16, 16, true);
  header.setUint16(20, 1, true);
  header.setUint16(22, 1, true);
  header.setUint32(24, GLASSES_RATE, true);
  header.setUint32(28, GLASSES_RATE * 2, true);
  header.setUint16(32, 2, true);
  header.setUint16(34, 16, true);
  str(36, "data");
  header.setUint32(40, pcm.byteLength, true);
  return new Blob([header, pcm.slice().buffer as ArrayBuffer], { type: "audio/wav" });
}
