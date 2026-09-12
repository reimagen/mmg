/** Browser client's live video source: whatever camera the device offers (rear camera on a phone). */
export async function openBrowserCamera(video: HTMLVideoElement): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 } }, audio: false });
  video.srcObject = stream;
  await video.play();
  return () => {
    for (const t of stream.getTracks()) t.stop();
    video.srcObject = null;
  };
}
