import type { MiddlewareHandler } from "hono";

const LATENCY_FRACTION_DIGITS = 3;

export const Severity = {
  INFO: "INFO",
  WARNING: "WARNING",
  ERROR: "ERROR"
} as const;

type SeverityLevel = (typeof Severity)[keyof typeof Severity];

export interface LogEntry {
  severity: SeverityLevel;
  message: string;
  [field: string]: unknown;
}

export type Log = (entry: LogEntry) => void;

const MILLISECONDS_PER_SECOND = 1000;
const FIRST_CLIENT_ERROR = 400;
const FIRST_SERVER_ERROR = 500;

export function writeLogLine(entry: LogEntry) {
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

function severityOf(status: number) {
  const isStatusAtLeastFirstServerError = status >= FIRST_SERVER_ERROR;
  if (isStatusAtLeastFirstServerError) {
    return Severity.ERROR;
  }

  const isStatusAtLeastFirstClientError = status >= FIRST_CLIENT_ERROR;
  if (isStatusAtLeastFirstClientError) {
    return Severity.WARNING;
  }

  return Severity.INFO;
}

export function requestLogger(log: Log) {
  return (async (context, next) => {
    const startedAt = performance.now();
    await next();
    const latencySeconds = (performance.now() - startedAt) / MILLISECONDS_PER_SECOND;
    const { status } = context.res;
    log({
      severity: severityOf(status),
      message: `${context.req.method} ${context.req.path} ${status}`,
      httpRequest: {
        requestMethod: context.req.method,
        requestUrl: context.req.path,
        status,
        userAgent: context.req.header("user-agent") ?? "",
        latency: `${latencySeconds.toFixed(LATENCY_FRACTION_DIGITS)}s`
      }
    });
  }) satisfies MiddlewareHandler;
}
