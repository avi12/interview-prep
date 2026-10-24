import type { Engine } from "./engine.ts";
import type { StartResult } from "./extension-channel.ts";
import { freshSession } from "./session-schema.ts";
import { saveSession } from "./session.ts";
import { browser } from "wxt/browser";

const LIVE_WINDOW_SIZE = {
  width: 420,
  height: 720
};
const WINDOW_MARGIN = 16;
const WINDOW_TOP_OFFSET = 80;
const WINDOW_FAILED_TEXT = "Chrome would not open the tutor window";

const STARTED: StartResult = {
  isStarted: true,
  detail: ""
};

export interface VscodeTab {
  id: number;
  windowId: number;
  title: string;
}

export function refused(detail: string): StartResult {
  return {
    isStarted: false,
    detail
  };
}

export function closeWindow(windowId: number) {
  return browser.windows.remove(windowId).catch(() => {});
}

export function focusWindow(windowId: number) {
  return browser.windows.update(windowId, { focused: true }).catch(() => {});
}

async function besideWindow(windowId: number) {
  const vscodeWindow = await browser.windows.get(windowId).catch(() => null);
  const { left, top, width } = vscodeWindow ?? {};
  if (left === undefined || top === undefined || width === undefined) {
    return {};
  }

  return {
    left: Math.max(left, left + width - LIVE_WINDOW_SIZE.width - WINDOW_MARGIN),
    top: top + WINDOW_TOP_OFFSET
  };
}

async function createLiveWindow({ url, vscodeWindowId }: {
  url: string;
  vscodeWindowId: number;
}) {
  const options = {
    url,
    type: "popup",
    ...LIVE_WINDOW_SIZE,
    focused: true
  } as const;
  const positioned = await browser.windows.create({
    ...options,
    ...(await besideWindow(vscodeWindowId))
  }).catch(() => null);
  return positioned ?? browser.windows.create(options).catch(() => null);
}

export async function openLiveSession({ engine, url, vscodeTab, brief }: {
  engine: Engine;
  url: string;
  vscodeTab: VscodeTab;
  brief: string;
}) {
  const liveWindow = await createLiveWindow({
    url,
    vscodeWindowId: vscodeTab.windowId
  });
  const liveTab = liveWindow?.tabs?.[0]?.id;
  if (liveWindow?.id === undefined || liveTab === undefined) {
    return refused(WINDOW_FAILED_TEXT);
  }

  await saveSession(
    freshSession({
      engine,
      vscodeTab: vscodeTab.id,
      liveTab,
      liveWindow: liveWindow.id,
      title: vscodeTab.title,
      brief
    })
  );
  return STARTED;
}
