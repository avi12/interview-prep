export const PING_RESULT = {
  ok: "ok",
  partialLoss: "partial-loss",
  timedOut: "timed-out",
  unreachable: "unreachable",
  ttlExpired: "ttl-expired",
  unknownHost: "unknown-host",
} as const;

export type PingResult = (typeof PING_RESULT)[keyof typeof PING_RESULT];

export const SLOW_JUMP_MS = 50;

export type TraceReport = {
  hopCount: number;
  isReached: boolean;
  lastReplyAddress: string;
  firstSlowHop: number | null;
};

export function classifyPing(output: string): PingResult {
  return PING_RESULT.ok;
}

export function analyzeTrace(output: string): TraceReport {
  return { hopCount: 0, isReached: false, lastReplyAddress: "", firstSlowHop: null };
}
