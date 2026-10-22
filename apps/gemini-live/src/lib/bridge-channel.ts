import { defineCustomEventMessaging } from "@webext-core/messaging/page";
import type { TutorView } from "@scripts/lib/tutor-view.ts";
import type { BridgeReport } from "./bridge-report.ts";
import type { Activation, BridgeCall, Frame } from "./bridge-vocab.ts";
import type { PromptEvent } from "./prompt-clip.ts";

export const BridgeMessage = {
  PRESENT: "present",
  CAPTURE: "capture",
  REPORT: "report",
  ACTIVATE: "activate",
  CALL: "call",
  TUTOR_VIEW: "tutorView",
  PROMPT_CLIP: "promptClip"
} as const;

interface BridgeProtocolMap {
  [BridgeMessage.PRESENT](): Activation | null;
  [BridgeMessage.CAPTURE](): Frame | null;
  [BridgeMessage.REPORT](data: BridgeReport): void;
  [BridgeMessage.ACTIVATE](data: Activation): void;
  [BridgeMessage.CALL](data: { name: BridgeCall }): unknown;
  [BridgeMessage.TUTOR_VIEW](): TutorView | null;
  [BridgeMessage.PROMPT_CLIP](data: { event: PromptEvent }): string;
}

export const bridgeMessenger = defineCustomEventMessaging<BridgeProtocolMap>({ namespace: "interview-prep-glic@1" });
