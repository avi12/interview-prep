import { defineContentScript } from "#imports";
import { ExtensionMessage, extensionMessenger } from "@/lib/extension-channel.ts";
import { loadLanguage } from "@/lib/settings.ts";
import { EXTENSION_PRESENT_ATTRIBUTE, VoiceMessage, voiceMessenger } from "@/lib/voice-channel.ts";
import { VOICE_URL } from "@/lib/voice-page.ts";

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
    function handleHello() {
      return extensionMessenger.sendMessage(ExtensionMessage.VOICE_HELLO).catch(helloWithoutWorker);
    }
    voiceMessenger.onMessage(VoiceMessage.HELLO, handleHello);
    function handleCapture() {
      return extensionMessenger.sendMessage(ExtensionMessage.VOICE_CAPTURE).catch(() => null);
    }
    voiceMessenger.onMessage(VoiceMessage.CAPTURE, handleCapture);
    voiceMessenger.onMessage(VoiceMessage.REPORT, ({ data }) => {
      void extensionMessenger.sendMessage(ExtensionMessage.VOICE_REPORT, data).catch(() => {});
    });
    extensionMessenger.onMessage(ExtensionMessage.VOICE_STOP, () => voiceMessenger.sendMessage(VoiceMessage.STOP));
    function handleVoiceMicToggle() {
      return voiceMessenger.sendMessage(VoiceMessage.MIC_TOGGLE);
    }
    extensionMessenger.onMessage(ExtensionMessage.VOICE_MIC_TOGGLE, handleVoiceMicToggle);
  }
});
