// Relay to a laptop over wifi: glasses mic PCM (16 kHz, 16-bit, mono) goes
// up as binary frames; `{type:"wav", b64}` comes back and plays through the
// phone's selected audio output (the glasses, once picked in Settings > Bluetooth).
import {createAudioPlayer, setAudioModeAsync, type AudioPlayer} from 'expo-audio';
import {File, Paths} from 'expo-file-system';
import {useEffect, useRef, useState} from 'react';
import BluetoothSdk, {type ButtonPressEvent, type MicPcmEvent} from '@mentra/engine/bluetooth-sdk';

export type RelayStatus = 'off' | 'connecting' | 'on' | 'error';

export function useRelay() {
  const [status, setStatus] = useState<RelayStatus>('off');
  const [detail, setDetail] = useState('');
  const [frames, setFrames] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const player = useRef<AudioPlayer | null>(null);
  const frameCount = useRef(0);

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
    sock.onopen = () => {
      setStatus('on');
      sock.send(JSON.stringify({tag: 'PHONE', message: 'relay connected, mic on'}));
      BluetoothSdk.setMicState(true, true).catch((err) => {
        setStatus('error');
        setDetail(`mic: ${String(err)}`);
      });
      // Camera goes to MediaMTX on the same laptop as the relay; glasses must be on that wifi.
      const host = new URL(url.replace(/^ws/, 'http')).hostname;
      const streamId = `relay-${Date.now()}`;
      BluetoothSdk.startStream({streamId, streamUrl: `rtmp://${host}:1935/live/mentra-live`, type: 'start_stream', video: {fps: 15}})
        .then((s) => sock.send(JSON.stringify({tag: 'STREAM', message: `camera ${s.status} -> rtmp://${host}:1935/live/mentra-live`})))
        .catch((err) => sock.send(JSON.stringify({tag: 'STREAM', message: `camera failed: ${String(err)}`})));
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
    };
  };

  const disconnect = async () => {
    ws.current?.close();
    ws.current = null;
    setStatus('off');
    await BluetoothSdk.setMicState(false).catch(() => undefined);
    await BluetoothSdk.stopStream().catch(() => undefined);
  };

  return {status, detail, frames, connect, disconnect};
}
