import { browser } from "wxt/browser";
import type { Frame } from "./bridge-vocab.ts";
import { Sight } from "./live-state.ts";
import { isVscodeUrl } from "./vscode.ts";

const JPEG_MIME = "image/jpeg";
const CAPTURE_JPEG_QUALITY = 70;
const RESIZE_JPEG_QUALITY = 0.72;
const MAX_FRAME_WIDTH = 1600;
const MIN_CAPTURE_GAP_MS = 400;
const BASE64_CHUNK_BYTES = 0x8000;
const DATA_URL_PREFIX = /^data:[^,]+,/;
const MINIMIZED = "minimized";

interface Capture {
  sight: Sight;
  frame: Frame | null;
}

const HIDDEN: Capture = { sight: Sight.HIDDEN, frame: null };

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_BYTES) binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_BYTES));
  return btoa(binary);
};

const fitFrame = async (dataUrl: string): Promise<Frame> => {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const { width: sourceWidth, height: sourceHeight } = bitmap;
  const scale = Math.min(1, MAX_FRAME_WIDTH / sourceWidth);
  if (scale === 1) {
    bitmap.close();
    return { base64: dataUrl.replace(DATA_URL_PREFIX, ""), mimeType: JPEG_MIME, width: sourceWidth, height: sourceHeight };
  }
  const width = Math.round(sourceWidth * scale);
  const height = Math.round(sourceHeight * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context for the frame");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const resized = await canvas.convertToBlob({ type: JPEG_MIME, quality: RESIZE_JPEG_QUALITY });
  return { base64: bytesToBase64(new Uint8Array(await resized.arrayBuffer())), mimeType: JPEG_MIME, width, height };
};

const grab = async (tabId: number): Promise<Capture> => {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  const isShowingVscode = tab?.active && isVscodeUrl(tab.url);
  if (!tab || !isShowingVscode) return HIDDEN;
  const vscodeWindow = await browser.windows.get(tab.windowId).catch(() => null);
  if (!vscodeWindow || vscodeWindow.state === MINIMIZED) return HIDDEN;
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: CAPTURE_JPEG_QUALITY }).catch(() => null);
  if (!dataUrl) return HIDDEN;
  return { sight: Sight.SEEING, frame: await fitFrame(dataUrl) };
};

let last: { tabId: number; at: number; capture: Capture } | null = null;

export const captureVscode = async (tabId: number) => {
  if (last?.tabId === tabId && Date.now() - last.at < MIN_CAPTURE_GAP_MS) return last.capture;
  const capture = await grab(tabId).catch(() => HIDDEN);
  last = { tabId, at: Date.now(), capture };
  return capture;
};
