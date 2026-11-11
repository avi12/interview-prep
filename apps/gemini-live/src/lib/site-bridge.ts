import { type Engine, engineSchema } from "./engine.ts";
import { LiveState } from "./live-state.ts";
import type { Session } from "./session-schema.ts";
import { z } from "./zod.ts";
import { defineWindowMessaging } from "@webext-core/messaging/page";

const SITE_BRIDGE_NAMESPACE = "interview-prep-site-bridge";

export const startResultSchema = z.object({
  isStarted: z.boolean(),
  detail: z.string()
});
export type StartResult = z.infer<typeof startResultSchema>;

const voiceStatusSchema = z.object({
  engine: engineSchema,
  state: z.enum(LiveState),
  detail: z.string(),
  isMicOpen: z.boolean()
});
export type VoiceStatus = z.infer<typeof voiceStatusSchema>;

export const voiceStatusOrNoneSchema = voiceStatusSchema.nullable();

export const SiteBridgeMessage = {
  START: "siteStart",
  STOP: "siteStop",
  TOGGLE_MIC: "siteToggleMic",
  GET_STATUS: "siteGetStatus",
  GET_ENGINE: "siteGetEngine",
  STATUS_CHANGED: "siteStatusChanged"
} as const;

interface SiteBridgeProtocolMap {
  [SiteBridgeMessage.START](): StartResult;
  [SiteBridgeMessage.STOP](): void;
  [SiteBridgeMessage.TOGGLE_MIC](): void;
  [SiteBridgeMessage.GET_STATUS](): VoiceStatus | null;
  [SiteBridgeMessage.GET_ENGINE](): Engine;
  [SiteBridgeMessage.STATUS_CHANGED](status: VoiceStatus | null): void;
}

export const siteMessenger = defineWindowMessaging<SiteBridgeProtocolMap>({ namespace: SITE_BRIDGE_NAMESPACE });

export function voiceStatusOfSession(session: Session | null): VoiceStatus | null {
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
