import { defineCustomEventMessaging } from "@webext-core/messaging/page";
import type { BridgeReport } from "./bridge-report.ts";
import type { Activation, BridgeCall, Frame } from "./bridge-vocab.ts";

export const BridgeMessage = {
  PRESENT: "present",
  CAPTURE: "capture",
  REPORT: "report",
  ACTIVATE: "activate",
  CALL: "call"
} as const;

interface BridgeProtocolMap {
  [BridgeMessage.PRESENT](): Activation | null;
  [BridgeMessage.CAPTURE](): Frame | null;
  [BridgeMessage.REPORT](data: BridgeReport): void;
  [BridgeMessage.ACTIVATE](data: Activation): void;
  [BridgeMessage.CALL](data: { name: BridgeCall }): unknown;
}

export const bridgeMessenger = defineCustomEventMessaging<BridgeProtocolMap>({ namespace: "interview-prep-glic@1" });
