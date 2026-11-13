import { defineWindowMessaging } from "@webext-core/messaging/page";

import { engineSchema } from "./engine.ts";
import { LiveState } from "./live-state.ts";
import type { Session } from "./session-schema.ts";
import { zod } from "./zod.ts";

const SITE_BRIDGE_NAMESPACE = "interview-prep-site-bridge";

export const startResultSchema = zod.object({
  isStarted: zod.boolean(),
  detail: zod.string()
});
export type StartResult = zod.infer<typeof startResultSchema>;

const voiceStatusSchema = zod.object({
  engine: engineSchema,
  state: zod.enum(LiveState),
  detail: zod.string(),
  isMicOpen: zod.boolean()
});
export type VoiceStatus = zod.infer<typeof voiceStatusSchema>;

export const voiceStatusOrNoneSchema = voiceStatusSchema.nullable();

export const SiteBridgeMessage = {
  START: "siteStart",
  STOP: "siteStop",
  TOGGLE_MIC: "siteToggleMic",
  GET_STATUS: "siteGetStatus",
  STATUS_CHANGED: "siteStatusChanged"
} as const;

interface SiteBridgeProtocolMap {
  [SiteBridgeMessage.START](): StartResult;
  [SiteBridgeMessage.STOP](): void;
  [SiteBridgeMessage.TOGGLE_MIC](): void;
  [SiteBridgeMessage.GET_STATUS](): VoiceStatus | null;
  [SiteBridgeMessage.STATUS_CHANGED](status: VoiceStatus | null): void;
}

export const siteMessenger = defineWindowMessaging<SiteBridgeProtocolMap>({ namespace: SITE_BRIDGE_NAMESPACE });

export function voiceStatusOfSession(session: Session | null) {
  if (!session) {
    return null;
  }

  const { engine, state, detail, isMicOpen } = session;
  return voiceStatusSchema.parse({
    engine,
    state,
    detail,
    isMicOpen
  });
}
