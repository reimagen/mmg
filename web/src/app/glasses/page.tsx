"use client";

import { useEffect, useRef, useState } from "react";
import { GptLiveClient } from "@/lib/live/browser";
import type { DelegateResult, TranscriptTurn } from "@/lib/live/types";
import { snapshotVideo } from "@/lib/live/frame";
import { forwardVoiceToGlasses, openGlassesMic, type GlassesMic } from "@client/mentra/web/glassesAudio";
import { openGlassesCamera } from "@client/mentra/web/glassesCamera";

/** Mentra Live client. Same GptLiveClient as the browser-mic page; only the audio device differs. See client/mentra/README.md. */

const DEFAULT_RELAY = typeof window === "undefined" ? "" : `ws://${window.location.hostname}:8790/ui`;
const DEFAULT_WHEP = typeof window === "undefined" ? "" : `http://${window.location.hostname}:8889/live/mentra-live/whep`;

export default function Glasses() {
  const [relayUrl, setRelayUrl] = useState(DEFAULT_RELAY);
  const [whepUrl, setWhepUrl] = useState(DEFAULT_WHEP);
  const [cameraStatus, setCameraStatus] = useState("camera idle");
  const video = useRef<HTMLVideoElement | null>(null);
  const closeCamera = useRef<(() => void) | null>(null);
  const [relayStatus, setRelayStatus] = useState("relay idle");
  const [liveStatus, setLiveStatus] = useState("GPT Live idle");
  const [frames, setFrames] = useState(0);
  const [card, setCard] = useState("Waiting for a name…");
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [voiceToGlasses, setVoiceToGlasses] = useState(false);
  const mic = useRef<GlassesMic | null>(null);
  const live = useRef<GptLiveClient | null>(null);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const renderTimer = useRef<number | null>(null);

  useEffect(() => () => { mic.current?.close(); live.current?.stop(); closeCamera.current?.(); }, []);

  async function connectCamera() {
    closeCamera.current?.();
    if (!video.current) return;
    setCameraStatus("camera connecting…");
    try {
      closeCamera.current = await openGlassesCamera(whepUrl, video.current);
      setCameraStatus("camera live");
    } catch (e) {
      setCameraStatus(e instanceof Error ? e.message : "camera failed");
    }
  }

  function connectRelay() {
    mic.current?.close();
    mic.current = openGlassesMic(relayUrl, { status: setRelayStatus, frames: setFrames });
  }

  async function startLive() {
    const stream = mic.current?.stream;
    if (!stream) { setLiveStatus("connect the relay first"); return; }
    const client = new GptLiveClient({
      microphone: stream,
      // Demo: GPT Live's voice plays on the laptop. The glasses path is utterance-chunked WAV (0.5-1 s late); real-time needs react-native-webrtc on the phone.
      onOutputTrack: voiceToGlasses ? (track) => forwardVoiceToGlasses(track, relayUrl) : undefined,
      snapshot: () => (video.current ? snapshotVideo(video.current) : undefined),
      onStatus: setLiveStatus,
      onCard: (r: DelegateResult) => setCard(r.card),
      onTranscript: (turn) => {
        // Deltas arrive per token; render at most 4x/s and tell the health loop once per user turn.
        if (turnsRef.current[turnsRef.current.length - 1] !== turn) {
          turnsRef.current = [...turnsRef.current.slice(-11), turn];
          if (turn.role === "user") void fetch("/api/glasses/ingest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: turn.text, isFinal: false }) });
        }
        if (renderTimer.current === null) {
          renderTimer.current = window.setTimeout(() => { renderTimer.current = null; setTurns([...turnsRef.current]); }, 250);
        }
      },
    });
    live.current = client;
    try { await client.start(); } catch (e) { setLiveStatus(e instanceof Error ? e.message : "Live failed"); }
  }

  return (
    <main className="flex min-h-full flex-1 flex-col gap-8 px-8 py-8 md:px-16">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <p className="display text-3xl tracking-tight">MMG · glasses</p>
        <p className="text-sm text-[var(--hush)]">{relayStatus} · {frames} frames · {cameraStatus} · {liveStatus}</p>
      </header>

      <section className="mx-auto w-full max-w-xl rounded-sm bg-[var(--card)] px-8 py-10 text-[var(--ink)] shadow-[8px_12px_0_#110e09]">
        <p className="text-sm text-[var(--hush)]">whisper</p>
        <p className="mt-4 text-lg leading-relaxed">{card}</p>
      </section>

      <video ref={video} muted playsInline className="mx-auto w-full max-w-xl rounded-sm bg-black" />

      <div className="flex flex-wrap items-center gap-3">
        <input value={whepUrl} onChange={(e) => setWhepUrl(e.target.value)} className="min-w-80 rounded-sm bg-[var(--paper)] px-3 py-2 text-[var(--ink)]" />
        <button type="button" onClick={connectCamera} className="rounded-sm bg-[var(--paper)] px-4 py-2 text-[var(--ink)]">Connect glasses camera</button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input value={relayUrl} onChange={(e) => setRelayUrl(e.target.value)} className="min-w-80 rounded-sm bg-[var(--paper)] px-3 py-2 text-[var(--ink)]" />
        <button type="button" onClick={connectRelay} className="rounded-sm bg-[var(--paper)] px-4 py-2 text-[var(--ink)]">1. Connect glasses relay</button>
        <button type="button" onClick={startLive} className="rounded-sm bg-[var(--paper)] px-4 py-2 text-[var(--ink)]">2. Start GPT Live</button>
        <label className="flex items-center gap-2 text-sm text-[var(--hush)]">
          <input type="checkbox" checked={voiceToGlasses} onChange={(e) => setVoiceToGlasses(e.target.checked)} />
          voice to glasses (laggy)
        </label>
        <button type="button" onClick={() => { live.current?.stop(); setLiveStatus("GPT Live idle"); }} className="rounded-sm bg-[var(--paper)] px-4 py-2 text-[var(--ink)]">Stop</button>
      </div>

      <ol className="flex flex-col gap-1 text-sm">
        {turns.map((t, i) => <li key={i}><span className="text-[var(--hush)]">{t.role}: </span>{t.text}</li>)}
      </ol>
    </main>
  );
}
