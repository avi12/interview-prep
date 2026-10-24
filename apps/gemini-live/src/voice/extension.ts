import { frameSchema } from "@/lib/frame.ts";
import { VoiceMessage, voiceMessenger } from "@/lib/voice-channel.ts";
import { voiceHelloSchema, type VoiceReport } from "@/lib/voice-protocol.ts";
import { within } from "@/lib/within.ts";
import type { z } from "@/lib/zod.ts";

const HELLO_TIMEOUT_MS = 1500;
const CAPTURE_TIMEOUT_MS = 2000;

async function askExtension<T>({ timeoutMs, promise, schema }: {
  timeoutMs: number;
  promise: Promise<unknown>;
  schema: z.ZodType<T>;
}) {
  const answer = await within({
    timeoutMs,
    promise,
    fallback: null
  });
  const parsed = schema.safeParse(answer);
  return parsed.success ? parsed.data : null;
}

export function greetExtension() {
  return askExtension({
    timeoutMs: HELLO_TIMEOUT_MS,
    promise: voiceMessenger.sendMessage(VoiceMessage.HELLO),
    schema: voiceHelloSchema
  });
}

export function captureFromExtension() {
  return askExtension({
    timeoutMs: CAPTURE_TIMEOUT_MS,
    promise: voiceMessenger.sendMessage(VoiceMessage.CAPTURE),
    schema: frameSchema
  });
}

export function reportToExtension(report: VoiceReport) {
  voiceMessenger.sendMessage(VoiceMessage.REPORT, report).catch(() => undefined);
}
