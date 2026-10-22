import { browser } from "wxt/browser";
import type { Frame } from "./bridge-vocab.ts";
import { Sight } from "./live-state.ts";
import { isVscodeUrl } from "./vscode.ts";

const JPEG_MIME = "image/jpeg";
const CAPTURE_JPEG_QUALITY = 85;
const RESIZE_JPEG_QUALITY = 0.85;
const MAX_FRAME_WIDTH = 2200;
const MIN_CAPTURE_GAP_MS = 600;
const BASE64_CHUNK_BYTES = 0x8000;
const STAMP_HEIGHT_RATIO = 0.022;
const STAMP_BACKGROUND = "#000000";
const STAMP_COLOR = "#ffff00";
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

const stampClock = ({ context, width, height }: { context: OffscreenCanvasRenderingContext2D; width: number; height: number }) => {
  const label = new Date().toLocaleTimeString("en-GB");
  const fontSize = Math.round(height * STAMP_HEIGHT_RATIO);
  context.font = `bold ${fontSize}px monospace`;
  const boxWidth = context.measureText(label).width + fontSize;
  context.fillStyle = STAMP_BACKGROUND;
  context.fillRect(0, height - fontSize * 1.6, boxWidth, fontSize * 1.6);
  context.fillStyle = STAMP_COLOR;
  context.fillText(label, fontSize / 2, height - fontSize * 0.45);
};

const fitFrame = async (dataUrl: string): Promise<Frame> => {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const scale = Math.min(1, MAX_FRAME_WIDTH / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("no 2d context for the frame");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  stampClock({ context, width, height });
  const resized = await canvas.convertToBlob({ type: JPEG_MIME, quality: RESIZE_JPEG_QUALITY });
  return { base64: bytesToBase64(new Uint8Array(await resized.arrayBuffer())), mimeType: JPEG_MIME, width, height };
};

let last: { tabId: number; at: number; capture: Capture } | null = null;

const grab = async (tabId: number): Promise<Capture> => {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  const isShowingVscode = tab?.active && isVscodeUrl(tab.url);
  if (!tab || !isShowingVscode) return HIDDEN;
  const vscodeWindow = await browser.windows.get(tab.windowId).catch(() => null);
  if (!vscodeWindow || vscodeWindow.state === MINIMIZED) return HIDDEN;
  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: CAPTURE_JPEG_QUALITY }).catch(() => null);
  if (!dataUrl) return last?.tabId === tabId ? last.capture : HIDDEN;
  return { sight: Sight.SEEING, frame: await fitFrame(dataUrl) };
};

export const captureVscode = async (tabId: number) => {
  if (last?.tabId === tabId && Date.now() - last.at < MIN_CAPTURE_GAP_MS) return last.capture;
  const capture = await grab(tabId).catch(() => HIDDEN);
  last = { tabId, at: Date.now(), capture };
  return capture;
};
