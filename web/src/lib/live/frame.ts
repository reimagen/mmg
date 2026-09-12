/** Grab the current frame of any playing <video> as a JPEG data URL for GptLiveClient's `snapshot` seam. */
export function snapshotVideo(video: HTMLVideoElement, maxWidth = 640): string | undefined {
  if (video.readyState < 2 || video.videoWidth === 0) return undefined;
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.7);
}
