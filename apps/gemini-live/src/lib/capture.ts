import type { Frame } from "./bridge-vocab.ts";
import { ExtensionMessage, extensionMessenger, type FocusRect } from "./extension-channel.ts";
import { bytesToBase64 } from "./live-api/base64.ts";
import { Sight } from "./live-state.ts";
import { isVscodeUrl } from "./vscode.ts";
import { browser } from "wxt/browser";

const JPEG_MIME = "image/jpeg";
const CAPTURE_JPEG_QUALITY = 85;
const RESIZE_JPEG_QUALITY = 0.85;
const MAX_FRAME_WIDTH = 2200;
const MIN_CAPTURE_GAP_MS = 600;
const MINIMIZED = "minimized";

interface Capture {
  sight: Sight;
  frame: Frame | null;
}

const HIDDEN: Capture = {
  sight: Sight.HIDDEN,
  frame: null
};

function cropOf({ bitmap, rect }: {
  bitmap: ImageBitmap;
  rect: FocusRect | null;
}) {
  const whole = {
    x: 0,
    y: 0,
    width: bitmap.width,
    height: bitmap.height
  };
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    return whole;
  }

  const pixelsPerCssPixel = bitmap.width / rect.viewportWidth;
  const x = Math.max(0, Math.round(rect.left * pixelsPerCssPixel));
  const y = Math.max(0, Math.round(rect.top * pixelsPerCssPixel));
  const width = Math.min(bitmap.width - x, Math.round(rect.width * pixelsPerCssPixel));
  const height = Math.min(bitmap.height - y, Math.round(rect.height * pixelsPerCssPixel));
  return width > 0 && height > 0 ? {
    x,
    y,
    width,
    height
  } : whole;
}

async function fitFrame({ dataUrl, rect }: {
  dataUrl: string;
  rect: FocusRect | null;
}): Promise<Frame> {
  const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
  const crop = cropOf({
    bitmap,
    rect
  });
  const scale = Math.min(1, MAX_FRAME_WIDTH / crop.width);
  const width = Math.round(crop.width * scale);
  const height = Math.round(crop.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("no 2d context for the frame");
  }

  context.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, width, height);
  bitmap.close();
  const resized = await canvas.convertToBlob({
    type: JPEG_MIME,
    quality: RESIZE_JPEG_QUALITY
  });
  return {
    base64: bytesToBase64(new Uint8Array(await resized.arrayBuffer())),
    mimeType: JPEG_MIME,
    width,
    height
  };
}

let last: {
  tabId: number;
  takenAt: number;
  capture: Capture;
} | null = null;

async function grab(tabId: number): Promise<Capture> {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  const isShowingVscode = tab?.active && isVscodeUrl(tab.url);
  if (!tab || !isShowingVscode) {
    return HIDDEN;
  }

  const vscodeWindow = await browser.windows.get(tab.windowId).catch(() => null);
  if (!vscodeWindow || vscodeWindow.state === MINIMIZED) {
    return HIDDEN;
  }

  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: "jpeg",
    quality: CAPTURE_JPEG_QUALITY
  }).catch(() => null);
  if (!dataUrl) {
    return last?.tabId === tabId ? last.capture : HIDDEN;
  }

  const rect = await extensionMessenger
    .sendMessage(ExtensionMessage.VSCODE_FOCUS_RECT, undefined, tabId)
    .catch(() => null);
  return {
    sight: Sight.SEEING,
    frame: await fitFrame({
      dataUrl,
      rect
    })
  };
}

export async function captureVscode(tabId: number) {
  if (last?.tabId === tabId && Date.now() - last.takenAt < MIN_CAPTURE_GAP_MS) {
    return last.capture;
  }

  const capture = await grab(tabId).catch(() => HIDDEN);
  last = {
    tabId,
    takenAt: Date.now(),
    capture
  };
  return capture;
}
