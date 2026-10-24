import { VoiceMessage, voiceMessenger, type VoiceReport } from "@/lib/voice-channel.ts";
import { within } from "@/lib/within.ts";

const HELLO_TIMEOUT_MS = 1500;
const CAPTURE_TIMEOUT_MS = 2000;

export function greetExtension() {
  return within({
    timeoutMs: HELLO_TIMEOUT_MS,
    promise: voiceMessenger.sendMessage(VoiceMessage.HELLO),
    fallback: null
  });
}

export function captureFromExtension() {
  return within({
    timeoutMs: CAPTURE_TIMEOUT_MS,
    promise: voiceMessenger.sendMessage(VoiceMessage.CAPTURE),
    fallback: null
  });
}

export function reportToExtension(report: VoiceReport) {
  voiceMessenger.sendMessage(VoiceMessage.REPORT, report).catch(() => undefined);
}
