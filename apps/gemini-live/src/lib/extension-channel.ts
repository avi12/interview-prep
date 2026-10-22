import type { Activation, Frame, GlicCommandMap, GlicReportMap } from "./bridge-vocab.ts";
import type { TutorView } from "@scripts/lib/tutor-view.ts";
import { defineExtensionMessaging } from "@webext-core/messaging";

export const ExtensionMessage = {
  LIVE_START: "liveStart",
  LIVE_STOP: "liveStop",
  MIC_TOGGLE: "micToggle",
  MIC_KEY_GRANTED: "micKeyGranted",
  GLIC_HELLO: "glicHello",
  GLIC_CAPTURE: "glicCapture",
  GLIC_RETITLE: "glicRetitle",
  GLIC_TUTOR_VIEW: "glicTutorView",
  VSCODE_FOCUS_RECT: "vscodeFocusRect"
} as const;

interface GlicHello {
  isMine: boolean;
  title: string;
  url: string;
}

export interface FocusRect {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
}

export interface StartResult {
  isStarted: boolean;
  detail: string;
}

interface ExtensionProtocolMap extends GlicCommandMap, GlicReportMap {
  [ExtensionMessage.LIVE_START](): StartResult;
  [ExtensionMessage.LIVE_STOP](): void;
  [ExtensionMessage.MIC_TOGGLE](): void;
  [ExtensionMessage.MIC_KEY_GRANTED](): void;
  [ExtensionMessage.GLIC_HELLO](): GlicHello;
  [ExtensionMessage.GLIC_CAPTURE](): Frame | null;
  [ExtensionMessage.GLIC_RETITLE](data: Activation): void;
  [ExtensionMessage.GLIC_TUTOR_VIEW](): TutorView | null;
  [ExtensionMessage.VSCODE_FOCUS_RECT](): FocusRect | null;
}

export const extensionMessenger = defineExtensionMessaging<ExtensionProtocolMap>();
