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

const HOP_LINE = /^\s*(\d+)\s+(.+?)\s*$/;
const ROUND_TRIP = /<?(\d+)\s*ms/g;
const TRAILING_ADDRESS = /(\d+\.\d+\.\d+\.\d+)\s*$/;
const LOSS_LINE = /Lost = (\d+)/;
const RECEIVED_LINE = /Received = (\d+)/;
const TRACE_COMPLETE = "Trace complete.";

export function classifyPing(output: string): PingResult {
  if (output.includes("could not find host")) return PING_RESULT.unknownHost;
  if (output.includes("TTL expired in transit")) return PING_RESULT.ttlExpired;
  if (output.includes("Destination host unreachable")) return PING_RESULT.unreachable;
  const lost = Number(LOSS_LINE.exec(output)?.[1] ?? 0);
  const received = Number(RECEIVED_LINE.exec(output)?.[1] ?? 0);
  if (received === 0) return PING_RESULT.timedOut;
  if (lost > 0) return PING_RESULT.partialLoss;
  return PING_RESULT.ok;
}

const average = (values: number[]) => {
  let total = 0;
  for (const value of values) total += value;
  return total / values.length;
};

export function analyzeTrace(output: string): TraceReport {
  const report: TraceReport = {
    hopCount: 0,
    isReached: output.includes(TRACE_COMPLETE),
    lastReplyAddress: "",
    firstSlowHop: null,
  };
  let previousAverage: number | null = null;
  for (const line of output.split(/\r?\n/)) {
    const match = HOP_LINE.exec(line);
    if (!match) continue;
    report.hopCount += 1;
    const times = [...match[2].matchAll(ROUND_TRIP)].map((time) => Number(time[1]));
    if (times.length === 0) continue;
    const hopAverage = average(times);
    const isSlow = previousAverage !== null && hopAverage - previousAverage >= SLOW_JUMP_MS;
    if (isSlow && report.firstSlowHop === null) report.firstSlowHop = Number(match[1]);
    previousAverage = hopAverage;
    report.lastReplyAddress = TRAILING_ADDRESS.exec(match[2])?.[1] ?? report.lastReplyAddress;
  }
  return report;
}
