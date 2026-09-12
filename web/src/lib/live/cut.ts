/** Hits the server hangup so OpenAI stops duration billing even if WebRTC is already dead. */
export function cutLiveBilling() {
  try {
    navigator.sendBeacon("/api/session/hangup");
  } catch {
    /* ignore */
  }
  void fetch("/api/session/hangup", { method: "POST", keepalive: true });
}
