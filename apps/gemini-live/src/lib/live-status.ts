import { LiveState, Sight } from "./live-state.ts";
import type { Session } from "./session.ts";

export const Tone = {
  OK: "ok",
  WARN: "warn",
  DANGER: "danger",
  IDLE: "idle"
} as const;
export type Tone = (typeof Tone)[keyof typeof Tone];

const STATE_TEXT: Record<LiveState, string> = {
  [LiveState.OPENING]: "Opening the Gemini window",
  [LiveState.BRIEFING]: "Briefing your tutor",
  [LiveState.LIVE]: "Gemini is listening and watching your VS Code",
  [LiveState.PAUSED]: "Gemini paused, bringing it back",
  [LiveState.RECONNECTING]: "Gemini dropped, reconnecting",
  [LiveState.FAILED]: "Gemini could not start"
};

const STATE_TONE: Record<LiveState, Tone> = {
  [LiveState.OPENING]: Tone.WARN,
  [LiveState.BRIEFING]: Tone.WARN,
  [LiveState.LIVE]: Tone.OK,
  [LiveState.PAUSED]: Tone.WARN,
  [LiveState.RECONNECTING]: Tone.WARN,
  [LiveState.FAILED]: Tone.DANGER
};

const HIDDEN_TEXT = "Gemini is listening but cannot see VS Code, bring its tab to the front";

const isBlind = (session: Session) => session.state === LiveState.LIVE && session.sight === Sight.HIDDEN;

export const sessionText = (session: Session) => {
  if (session.state === LiveState.FAILED) return session.detail || STATE_TEXT[LiveState.FAILED];
  if (isBlind(session)) return HIDDEN_TEXT;
  return STATE_TEXT[session.state];
};

export const sessionTone = (session: Session | null) => {
  if (!session) return Tone.IDLE;
  if (isBlind(session)) return Tone.WARN;
  return STATE_TONE[session.state];
};
