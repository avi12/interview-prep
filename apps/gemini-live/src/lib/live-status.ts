import { LiveState, Sight } from "./live-state.ts";
import { MIC_KEY_LABEL } from "./mic-key.ts";
import type { Session } from "./session-schema.ts";

export const Tone = {
  OK: "ok",
  WARN: "warn",
  DANGER: "danger",
  IDLE: "idle"
} as const;
type Tone = (typeof Tone)[keyof typeof Tone];

const STATE_TEXT: Record<LiveState, string> = {
  [LiveState.OPENING]: "Opening the Gemini window",
  [LiveState.BRIEFING]: "Briefing your tutor",
  [LiveState.LIVE]: "Gemini is listening and watching your VS Code",
  [LiveState.PAUSED]: "Gemini paused, bringing it back",
  [LiveState.RECONNECTING]: "Gemini dropped, reconnecting",
  [LiveState.FAILED]: "Gemini could not start"
};

const STATE_LABEL: Record<LiveState, string> = {
  [LiveState.OPENING]: "Opening",
  [LiveState.BRIEFING]: "Getting ready",
  [LiveState.LIVE]: "Listening",
  [LiveState.PAUSED]: "Paused",
  [LiveState.RECONNECTING]: "Reconnecting",
  [LiveState.FAILED]: "Stopped"
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
const HIDDEN_LABEL = "Can't see VS Code";

const MUTED_TEXT = `Gemini is watching your VS Code with your mic muted, press ${MIC_KEY_LABEL} to talk`;
const MUTED_LABEL = "Watching";

function isBlind(session: Session) {
  return session.state === LiveState.LIVE && session.sight === Sight.HIDDEN;
}

function isMuted(session: Session) {
  return session.state === LiveState.LIVE && !session.isMicOpen;
}

export function sessionText(session: Session) {
  if (session.state === LiveState.FAILED) {
    return session.detail || STATE_TEXT[LiveState.FAILED];
  }

  if (isBlind(session)) {
    return HIDDEN_TEXT;
  }

  if (isMuted(session)) {
    return MUTED_TEXT;
  }

  if (session.state === LiveState.LIVE) {
    return `${STATE_TEXT[session.state]} (${session.frames} pictures sent)`;
  }

  return STATE_TEXT[session.state];
}

export function sessionLabel(session: Session) {
  if (isBlind(session)) {
    return HIDDEN_LABEL;
  }

  if (isMuted(session)) {
    return MUTED_LABEL;
  }

  return STATE_LABEL[session.state];
}

export function sessionTone(session: Session | null) {
  if (!session) {
    return Tone.IDLE;
  }

  if (isBlind(session)) {
    return Tone.WARN;
  }

  if (isMuted(session)) {
    return Tone.IDLE;
  }

  return STATE_TONE[session.state];
}
