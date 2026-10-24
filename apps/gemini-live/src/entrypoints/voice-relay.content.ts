import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { loadLanguage } from "@/lib/settings.ts";
import { EXTENSION_PRESENT_ATTRIBUTE, VoiceMessage, voiceMessenger } from "@/lib/voice-channel.ts";
import { VOICE_URL } from "@/lib/voice-page.ts";
import { defineContentScript } from "#imports";

async function helloWithoutWorker() {
  return {
    language: await loadLanguage(),
    isAutostart: false
  };
}

export default defineContentScript({
  matches: [`${VOICE_URL}*`],
  runAt: "document_start",
  main() {
    document.documentElement.setAttribute(EXTENSION_PRESENT_ATTRIBUTE, "");
    voiceMessenger.onMessage(VoiceMessage.HELLO, () =>
      extensionMessenger.sendMessage(ExtensionMessage.VOICE_HELLO).catch(helloWithoutWorker));
    voiceMessenger.onMessage(VoiceMessage.CAPTURE, () =>
      extensionMessenger.sendMessage(ExtensionMessage.VOICE_CAPTURE).catch(() => null));
    voiceMessenger.onMessage(VoiceMessage.REPORT, ({ data }) => {
      void extensionMessenger.sendMessage(ExtensionMessage.VOICE_REPORT, data).catch(() => {});
    });
    extensionMessenger.onMessage(ExtensionMessage.VOICE_STOP, () => voiceMessenger.sendMessage(VoiceMessage.STOP));
    extensionMessenger.onMessage(ExtensionMessage.VOICE_MIC_TOGGLE, () =>
      voiceMessenger.sendMessage(VoiceMessage.MIC_TOGGLE));
  }
});
