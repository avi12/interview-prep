import { FRAME_MIME_TYPE } from "./defaults.ts";
import { bytesToBase64 } from "@/lib/base64.ts";
import type { Frame } from "@/lib/frame.ts";

const MAX_FRAME_WIDTH = 1600;
const JPEG_QUALITY = 0.8;
const SHARE_FRAME_RATE = 5;

function toBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>(resolve => canvas.toBlob(resolve, FRAME_MIME_TYPE, JPEG_QUALITY));
}

export async function startScreenShare(onEnded: () => void) {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      frameRate: SHARE_FRAME_RATE
    },
    audio: false
  });
  const elVideo = document.createElement("video");
  elVideo.muted = true;
  elVideo.playsInline = true;
  elVideo.srcObject = stream;
  await elVideo.play();
  const elCanvas = document.createElement("canvas");
  for (const track of stream.getVideoTracks()) {
    track.addEventListener("ended", onEnded);
  }

  return {
    async grab(): Promise<Frame | null> {
      if (elVideo.videoWidth === 0) {
        return null;
      }

      const scale = Math.min(1, MAX_FRAME_WIDTH / elVideo.videoWidth);
      elCanvas.width = Math.round(elVideo.videoWidth * scale);
      elCanvas.height = Math.round(elVideo.videoHeight * scale);
      elCanvas.getContext("2d")?.drawImage(elVideo, 0, 0, elCanvas.width, elCanvas.height);
      const blob = await toBlob(elCanvas);
      if (!blob) {
        return null;
      }

      return {
        base64: bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
        mimeType: FRAME_MIME_TYPE,
        width: elCanvas.width,
        height: elCanvas.height
      };
    },
    stop() {
      for (const track of stream.getTracks()) {
        track.stop();
      }
      elVideo.srcObject = null;
    }
  };
}

export type ScreenShare = Awaited<ReturnType<typeof startScreenShare>>;
