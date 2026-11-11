import { formatWithLimits } from "#kit/format.ts";

const SHOWN_LIMITS = {
  depth: 3,
  maxArrayLength: 12,
  maxStringLength: 60
} as const;
const CLASS_SOURCE_PREFIX = "class";
const LINE_BREAK_INDENT = /\s*\n\s*/g;
const TRAILING_COMMA = /,(?=\s*[\]}])/g;
const CONTAINER_NAME = /\b(?:Array|Object) (?=[[{])/g;

let lastCall: string | null = null;

export function oneLine(text: string) {
  return text.replaceAll(LINE_BREAK_INDENT, " ").replaceAll(TRAILING_COMMA, "").replaceAll(CONTAINER_NAME, "");
}

export function formatValue(value: unknown) {
  return oneLine(
    formatWithLimits({
      value,
      limits: SHOWN_LIMITS
    })
  );
}

export function readLastCall() {
  return lastCall;
}

export function clearLastCall() {
  lastCall = null;
}

function isPlainFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === "function" && !Function.prototype.toString.call(value).startsWith(CLASS_SOURCE_PREFIX);
}

function recorded({ name, run }: {
  name: string;
  run: (...args: unknown[]) => unknown;
}) {
  return (...args: unknown[]) => {
    lastCall = `${name}(${args.map(formatValue).join(", ")})`;
    return run(...args);
  };
}

export function withRecordedCalls<T extends object>(module: T) {
  const recordedFunctions: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(module)) {
    if (isPlainFunction(value)) {
      recordedFunctions[name] = recorded({
        name,
        run: value
      });
    }
  }
  return {
    ...module,
    ...recordedFunctions
  };
}
