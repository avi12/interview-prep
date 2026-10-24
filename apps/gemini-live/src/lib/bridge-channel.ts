import type { Activation, GlicCommandMap, GlicReportMap } from "./bridge-vocab.ts";
import type { Frame } from "./frame.ts";
import type { PromptEvent } from "./prompt-clip.ts";
import type { TutorView } from "@scripts/lib/tutor-view.ts";
import { defineCustomEventMessaging } from "@webext-core/messaging/page";

export const BridgeMessage = {
  PRESENT: "present",
  CAPTURE: "capture",
  ACTIVATE: "activate",
  TUTOR_VIEW: "tutorView",
  PROMPT_CLIP: "promptClip"
} as const;

interface BridgeProtocolMap extends GlicCommandMap, GlicReportMap {
  [BridgeMessage.PRESENT](): Activation | null;
  [BridgeMessage.CAPTURE](): Frame | null;
  [BridgeMessage.ACTIVATE](data: Activation): void;
  [BridgeMessage.TUTOR_VIEW](): TutorView | null;
  [BridgeMessage.PROMPT_CLIP](data: { event: PromptEvent }): string;
}

export const bridgeMessenger = defineCustomEventMessaging<BridgeProtocolMap>({ namespace: "interview-prep-glic@1" });
