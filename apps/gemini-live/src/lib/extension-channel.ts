import { defineExtensionMessaging } from "@webext-core/messaging";
import type { BridgeReport } from "./bridge-report.ts";
import type { Activation, BridgeCall, Frame } from "./bridge-vocab.ts";

export const ExtensionMessage = {
  LIVE_START: "liveStart",
  LIVE_STOP: "liveStop",
  GLIC_HELLO: "glicHello",
  GLIC_CAPTURE: "glicCapture",
  GLIC_REPORT: "glicReport",
  GLIC_CALL: "glicCall",
  GLIC_RETITLE: "glicRetitle",
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

interface ExtensionProtocolMap {
  [ExtensionMessage.LIVE_START](): StartResult;
  [ExtensionMessage.LIVE_STOP](): void;
  [ExtensionMessage.GLIC_HELLO](): GlicHello;
  [ExtensionMessage.GLIC_CAPTURE](): Frame | null;
  [ExtensionMessage.GLIC_REPORT](data: BridgeReport): void;
  [ExtensionMessage.GLIC_CALL](data: { name: BridgeCall }): unknown;
  [ExtensionMessage.GLIC_RETITLE](data: Activation): void;
  [ExtensionMessage.VSCODE_FOCUS_RECT](): FocusRect | null;
}

export const extensionMessenger = defineExtensionMessaging<ExtensionProtocolMap>();
