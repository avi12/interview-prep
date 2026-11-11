import type { MiddlewareHandler } from "hono";

export const Severity = {
  info: "INFO",
  warning: "WARNING",
  error: "ERROR"
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
  if (status >= FIRST_SERVER_ERROR) {
    return Severity.error;
  }

  if (status >= FIRST_CLIENT_ERROR) {
    return Severity.warning;
  }

  return Severity.info;
}

export function requestLogger(log: Log): MiddlewareHandler {
  return async (context, next) => {
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
        latency: `${latencySeconds.toFixed(3)}s`
      }
    });
  };
}
