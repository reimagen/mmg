# client/browser — laptop mic fallback

The default client. `web/src/app/page.tsx` builds `GptLiveClient` with no
audio options, so it uses `navigator.mediaDevices.getUserMedia` for input and
an `<audio>` element for output. Nothing in this folder needs to run.

Every other client (see `client/mentra`) plugs into the same seam:
`GptLiveClient({ microphone: MediaStream, onOutputTrack })` in
`web/src/lib/live/browser.ts`. The core never branches on which client is
connected.
