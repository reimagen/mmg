/**
 * Mentra Live camera as a browser <video>. The glasses publish RTMP/WHIP to
 * MediaMTX on the laptop; this pulls that stream back out over WHEP (WebRTC
 * playback) so the page can show it and `snapshotVideo` can grab frames.
 * WHEP: https://www.ietf.org/archive/id/draft-ietf-wish-whep-01.html
 */
export async function openGlassesCamera(whepUrl: string, video: HTMLVideoElement): Promise<() => void> {
  const peer = new RTCPeerConnection();
  peer.addTransceiver("video", { direction: "recvonly" });
  peer.addTransceiver("audio", { direction: "recvonly" });
  peer.addEventListener("track", (e) => {
    video.srcObject = e.streams[0] ?? new MediaStream([e.track]);
    void video.play();
  });
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await new Promise<void>((resolve) => {
    if (peer.iceGatheringState === "complete") return resolve();
    const done = () => { if (peer.iceGatheringState === "complete") { peer.removeEventListener("icegatheringstatechange", done); resolve(); } };
    peer.addEventListener("icegatheringstatechange", done);
    setTimeout(resolve, 2_000);
  });
  const res = await fetch(whepUrl, { method: "POST", headers: { "content-type": "application/sdp" }, body: peer.localDescription?.sdp ?? "" });
  if (!res.ok) { peer.close(); throw new Error(`WHEP ${res.status}: is the stream running? ${whepUrl}`); }
  await peer.setRemoteDescription({ type: "answer", sdp: await res.text() });
  return () => { peer.close(); video.srcObject = null; };
}
