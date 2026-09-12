# client/mentra — Mentra Live glasses as a GPT Live client (Saint)

Status 2026-09-12: **live on hardware**. Glasses mic and camera reach the
laptop; GPT Live runs on them. Voice back to the glasses works but is opt-in.

Demo mode (default): glasses give **mic + camera**; GPT Live's voice and the
transcript play on the laptop. "voice to glasses" is an opt-in checkbox on
`/glasses` and is 0.5-1 s late (WAV utterances over the phone). Proper fix,
not built: add `react-native-webrtc` to the phone app and forward GPT Live's
output track to the phone over a peer connection; the phone plays it through
the glasses in real time.

The core (`web/src/lib/live`) does not know this client exists. `GptLiveClient`
takes an optional `microphone: MediaStream` and `onOutputTrack`. This folder
supplies both from the glasses. `client/browser` is the fallback: the same
client with no options, so the browser mic.

## Why not the MentraOS cloud SDK or miniapp

Cloud SDK apps died 2026-08-03 (MentraOS 3.0). The Miniapp SDK is phone-side
beta with no distribution and Mentra's own docs say to use the Bluetooth SDK
for Mentra Live. So: Bluetooth SDK phone app -> wifi -> laptop.

## Pieces

| Path | Runs on | Does |
|---|---|---|
| `phone/relay.ts` + `phone/starter-kit.patch` | iPhone (Mentra Bluetooth SDK starter kit, React Native) | `useRelay`: turns the glasses mic on, streams 16 kHz 16-bit mono PCM to the laptop over WebSocket, plays incoming WAVs out the glasses. |
| `relay/server.ts` + `relay/ui.html` | laptop, Bun, port 8790 | `/glasses` WS from the phone; `/ui` WS fan-out to browsers; `POST /wav` and `POST /say` push audio back to the phone. `ui.html` is a debug meter. |
| `web/glassesAudio.ts` | browser | `openGlassesMic(relayWs)` -> `MediaStream`; `forwardVoiceToGlasses(track, relayWs)` cuts GPT Live's voice into WAV utterances and POSTs them to `/wav`. |
| `web/src/app/glasses/page.tsx` | Next | thin page: relay -> `GptLiveClient({ microphone, onOutputTrack })`. |
| `web/glassesCamera.ts` | browser | `openGlassesCamera(whepUrl, video)`: pulls the glasses stream out of MediaMTX over WHEP into a `<video>`. |

## Live video contract (every client)

`gpt-live-1` takes audio and text only (model page: "Unsupported modalities:
image, video"). So vision rides delegation: `GptLiveClient({ snapshot })` calls
`snapshot()` on every `session.delegation.created` and sends the JPEG as
`frame`; `POST /api/delegate` saves it to `web/data/frames/<delegation_id>.jpg`
and returns `frame_ref`. The memory/face lane reads that file. Mentra supplies
frames from the MediaMTX stream (`snapshotVideo` in `web/src/lib/live/frame.ts`);
the browser client would supply them from `getUserMedia({ video })` the same way.

## Protocol (relay)

- phone -> relay: binary frame = raw PCM16LE 16 kHz mono; text frame = `{tag, message}` event (buttons).
- relay -> phone: `{type:"wav", b64}`; phone queues and plays in order.
- relay -> browser (`/ui`): binary PCM passthrough; `{type:"event", at, tag, message}`.

## Run book

Laptop (same wifi as the phone; find the ip with `ipconfig getifaddr en0`):

```bash
cd client/mentra/relay && bun server.ts                       # :8790
cd ~/Dev/mentra-bt-kit/examples/react-native && bunx expo start --dev-client --offline   # :8081
mediamtx /opt/homebrew/etc/mediamtx/mediamtx.yml               # camera ingest, brew install mediamtx
cd web && npm run dev                                          # :3000
```

Phone (one-time setup below): open "Mentra SDK RN", tap the `<laptop-ip>:8081`
server. Device tab: connect glasses. iOS Settings > Bluetooth: pick the glasses
as audio output (required for sound to reach them). System tab > "Laptop relay"
> URL `ws://<laptop-ip>:8790/glasses` > Start relay.

Browser: `http://localhost:3000/glasses` > 1. Connect glasses relay > 2. Start GPT Live.

Camera: System tab > Wi-Fi: join the laptop's wifi. Stream tab > Use cloud
server > RTMP `rtmp://<laptop-ip>:1935/live/mentra-live` > Start. View at
`http://<laptop-ip>:8889/live/mentra-live`. Glasses LED is on while streaming.

## Phone one-time setup (starter kit)

```bash
git clone https://github.com/Mentra-Community/Mentra-Bluetooth-SDK-Starter-Kit.git ~/Dev/mentra-bt-kit
cd ~/Dev/mentra-bt-kit/examples/react-native
cp <mmg>/client/mentra/phone/relay.ts src/relay.ts
git apply <mmg>/client/mentra/phone/starter-kit.patch   # relay card + drops entitlements a free Apple team cannot sign
bun install && bun run ios:setup && bunx expo prebuild --platform ios
```

Then in Xcode (`ios/MentraSDKRN.xcworkspace`): sign in, pick a team, set the
bundle id to something you own (we use `com.bootoshi.mentra.rn`), then
`bunx expo run:ios --device "<phone name>"`. Phone: Developer Mode on, trust the
profile under VPN & Device Management. Update the glasses to `3.1.0` from the
app's OTA screen; SDK and firmware versions must match.

Gotcha: `expo start` without `--offline` asks expo.dev to sign the manifest and
returns HTTP 500 to the phone ("failed to load"). Always pass `--offline`.

## Ceilings

- Voice back to the glasses is utterance-chunked WAV (400 ms silence or 3 s
  max), so GPT Live's reply lands about half a second late. A streaming PCM
  player on the phone removes that.
- Relay has no auth; it is LAN-only by design.
