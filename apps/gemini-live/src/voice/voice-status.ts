import { LiveState } from "@/lib/live-state.ts";

const STATE_TEXT: Record<LiveState, string> = {
  [LiveState.OPENING]: "Connecting to Gemini",
  [LiveState.BRIEFING]: "Briefing your tutor",
  [LiveState.LIVE]: "Your tutor is listening",
  [LiveState.PAUSED]: "Paused",
  [LiveState.RECONNECTING]: "Gemini asked to reconnect, picking the conversation back up",
  [LiveState.FAILED]: "The session ended"
};

const MUTED_TEXT = "Your mic is muted, unmute to talk";
export const STOPPED_TEXT = "You stopped the tutor";
export const MIC_DENIED_TEXT = "The microphone is blocked. Allow it for this page in the address bar, then press Start again.";
export const SETUP_REJECTED_TEXT = "Gemini refused to start. Check the API key above.";
export const NO_KEY_TEXT = "Save a Gemini API key above to start";
export const READY_TEXT = "Ready when you are";

export function statusText({ state, detail, isMicOpen }: {
  state: LiveState;
  detail: string;
  isMicOpen: boolean;
}) {
  if (state === LiveState.FAILED) {
    return detail || STATE_TEXT[state];
  }

  if (state === LiveState.LIVE && !isMicOpen) {
    return MUTED_TEXT;
  }

  return STATE_TEXT[state];
}
