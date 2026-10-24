import type { Frame } from "./frame.ts";
import type { VoiceHello, VoiceReport } from "./voice-protocol.ts";
import { defineCustomEventMessaging } from "@webext-core/messaging/page";

const VOICE_CHANNEL_NAMESPACE = "interview-prep-voice";
export const EXTENSION_PRESENT_ATTRIBUTE = "data-tutor-extension";

export const VoiceMessage = {
  HELLO: "voiceHello",
  REPORT: "voiceReport",
  CAPTURE: "voiceCapture",
  STOP: "voiceStop",
  MIC_TOGGLE: "voiceMicToggle"
} as const;

interface VoiceProtocolMap {
  [VoiceMessage.HELLO](): VoiceHello;
  [VoiceMessage.REPORT](report: VoiceReport): void;
  [VoiceMessage.CAPTURE](): Frame | null;
  [VoiceMessage.STOP](): void;
  [VoiceMessage.MIC_TOGGLE](): void;
}

export const voiceMessenger = defineCustomEventMessaging<VoiceProtocolMap>({ namespace: VOICE_CHANNEL_NAMESPACE });
