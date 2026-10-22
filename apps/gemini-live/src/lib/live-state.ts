export const LiveState = {
  OPENING: "opening",
  BRIEFING: "briefing",
  LIVE: "live",
  PAUSED: "paused",
  RECONNECTING: "reconnecting",
  FAILED: "failed"
} as const;
export type LiveState = (typeof LiveState)[keyof typeof LiveState];

export const Sight = {
  UNKNOWN: "unknown",
  SEEING: "seeing",
  HIDDEN: "hidden"
} as const;
export type Sight = (typeof Sight)[keyof typeof Sight];

const RUNNING_STATES: ReadonlySet<LiveState> = new Set([
  LiveState.OPENING,
  LiveState.BRIEFING,
  LiveState.LIVE,
  LiveState.PAUSED,
  LiveState.RECONNECTING
]);

export function isRunning(state: LiveState) {
  return RUNNING_STATES.has(state);
}
