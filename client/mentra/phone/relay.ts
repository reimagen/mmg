// Relay to a laptop over wifi: glasses mic PCM (16 kHz, 16-bit, mono) goes
// up as binary frames; `{type:"wav", b64}` comes back and plays through the
// phone's selected audio output (the glasses, once picked in Settings > Bluetooth).
import {createAudioPlayer, setAudioModeAsync, type AudioPlayer} from 'expo-audio';
import {File, Paths} from 'expo-file-system';
import {useEffect, useRef, useState} from 'react';
import BluetoothSdk, {type ButtonPressEvent, type MicPcmEvent, type StreamStatusEvent} from '@mentra/engine/bluetooth-sdk';

export type RelayStatus = 'off' | 'connecting' | 'on' | 'error';

export function useRelay() {
  const [status, setStatus] = useState<RelayStatus>('off');
  const [detail, setDetail] = useState('');
  const [frames, setFrames] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const frameCount = useRef(0);
  const streamSub = useRef<{remove: () => void} | null>(null);

  useEffect(() => {
    const subs = [
      BluetoothSdk.addListener('mic_pcm', (e: MicPcmEvent) => {
        const sock = ws.current;
        if (!sock || sock.readyState !== WebSocket.OPEN) return;
        const raw = e.pcm as unknown;
        const bytes = raw instanceof ArrayBuffer ? raw : ArrayBuffer.isView(raw) ? raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) : Uint8Array.from(raw as ArrayLike<number>).buffer;
        sock.send(bytes);
        frameCount.current += 1;
        if (frameCount.current % 25 === 0) setFrames(frameCount.current);
      }),
      BluetoothSdk.addListener('button_press', (e: ButtonPressEvent) => {
        ws.current?.send(JSON.stringify({tag: 'BUTTON', message: `${e.buttonId} ${e.pressType}`}));
      }),
    ];
    return () => {
      for (const s of subs) s.remove();
      ws.current?.close();
      player.current?.remove();
    };
  }, []);

  const queue = useRef<string[]>([]);
  const playing = useRef(false);

  const playNext = async () => {
    const b64 = queue.current.shift();
    if (!b64) {
      playing.current = false;
      await BluetoothSdk.setOwnAppAudioPlaying(false).catch(() => undefined);
      return;
    }
    playing.current = true;
    const file = new File(Paths.cache, `relay-${Date.now()}.wav`);
    file.create({intermediates: true, overwrite: true});
    file.write(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
    player.current?.remove();
    await setAudioModeAsync({interruptionMode: 'duckOthers', playsInSilentMode: true});
    const p = createAudioPlayer({uri: file.uri});
    player.current = p;
    p.addListener('playbackStatusUpdate', (s) => {
      if (s.didJustFinish) void playNext();
    });
    await BluetoothSdk.setOwnAppAudioPlaying(true);
    p.play();
  };

  const playWav = (b64: string) => {
    queue.current.push(b64);
    if (!playing.current) void playNext();
  };

  const connect = async (url: string) => {
    ws.current?.close();
    setStatus('connecting');
    setDetail(url);
    const sock = new WebSocket(url);
    sock.binaryType = 'arraybuffer';
    ws.current = sock;
    // Camera goes to MediaMTX on the same laptop as the relay; glasses must be on that wifi.
    const host = new URL(url.replace(/^ws/, 'http')).hostname;
    const streamUrl = `rtmp://${host}:1935/live/mentra-live`;
    const log = (message: string) => { if (ws.current === sock && sock.readyState === WebSocket.OPEN) sock.send(JSON.stringify({tag: 'STREAM', message})); };
    // One camera controller: a single in-flight start at a time. Overlapping starts each issue a stop, and every stop
    // supersedes the others' starts and emits "stopped", which used to schedule yet more starts (the on/off flicker).
    let inflight: Promise<void> | null = null;
    let lastRestart = 0;
    const startCamera = (attempt = 1) => {
      if (inflight || ws.current !== sock) return;
      inflight = (async () => {
        // The glasses ignore start_stream while they think one is still running; clear it first.
        await BluetoothSdk.stopStream().catch(() => undefined);
        try {
          // 720p at 1.5 Mbit: lighter on the glasses' wifi than the default; the sidecar detects at 640 anyway.
          const s = await BluetoothSdk.startStream({streamId: `relay-${Date.now()}`, streamUrl, type: 'start_stream', video: {width: 1280, height: 720, bitrate: 1_500_000, fps: 15}});
          log(`camera ${s.status} -> ${streamUrl}`);
        } catch (err) {
          log(`camera failed (try ${attempt}): ${String(err)}`);
          if (attempt < 3) setTimeout(() => startCamera(attempt + 1), 3000);
        }
      })().finally(() => { inflight = null; });
    };
    sock.onopen = () => {
      setStatus('on');
      sock.send(JSON.stringify({tag: 'PHONE', message: 'relay connected, mic on'}));
      BluetoothSdk.setMicState(true, true).catch((err) => {
        setStatus('error');
        setDetail(`mic: ${String(err)}`);
      });
      startCamera();
      // The glasses' RTMP publish stalls now and then (MediaMTX sees an i/o timeout). Restart it ourselves; the SDK only retries a few times.
      // Our own stop-before-start also emits "stopped": ignore events while starting, and never restart more than once per 15 s.
      streamSub.current?.remove();
      streamSub.current = BluetoothSdk.addListener('stream_status', (e: StreamStatusEvent) => {
        const stats = e.stats ? ` fps=${e.stats.fps ?? '?'} kbps=${Math.round((e.stats.bitrate ?? 0) / 1000)} dropped=${e.stats.droppedFrames ?? 0}` : '';
        const why = e.kind === 'error' ? ` ${e.errorDetails}` : e.kind === 'reconnect' && e.status === 'reconnecting' ? ` ${e.reason} (${e.attempt}/${e.maxAttempts})` : '';
        log(`stream ${e.status}${why}${stats}`);
        if (ws.current !== sock || inflight) return;
        if (e.status === 'stopped' || e.status === 'error' || e.status === 'reconnect_failed') {
          if (Date.now() - lastRestart < 15_000) return;
          lastRestart = Date.now();
          log('camera restart in 2s');
          setTimeout(() => startCamera(), 2000);
        }
      });
    };
    sock.onerror = () => {
      setStatus('error');
      setDetail(`cannot reach ${url}`);
    };
    sock.onclose = () => {
      if (ws.current === sock) setStatus((s) => (s === 'error' ? s : 'off'));
    };
    sock.onmessage = (ev) => {
      if (typeof ev.data !== 'string') return;
      const msg = JSON.parse(ev.data) as {type?: string; b64?: string};
      if (msg.type === 'wav' && msg.b64) void playWav(msg.b64);
      // The laptop's sidecar sees no frames while the glasses still report "streaming": restart from here.
      if (msg.type === 'camera_restart') { log('laptop reports stall -> restarting camera'); startCamera(); }
    };
  };

  const disconnect = async () => {
    streamSub.current?.remove();
    streamSub.current = null;
    ws.current?.close();
    ws.current = null;
    setStatus('off');
    await BluetoothSdk.setMicState(false).catch(() => undefined);
    await BluetoothSdk.stopStream().catch(() => undefined);
  };

  return {status, detail, frames, connect, disconnect};
}
