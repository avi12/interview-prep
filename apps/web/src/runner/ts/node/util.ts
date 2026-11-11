import { formatWithLimits } from "#kit/format.ts";

type Callback = (error: unknown, value?: unknown) => void;
type InspectOptions = {
  depth?: number;
  maxArrayLength?: number;
  maxStringLength?: number;
};

const DEFAULT_LIMITS = {
  depth: 2,
  maxArrayLength: 100,
  maxStringLength: 10_000
} as const;

function inspect(value: unknown, options: InspectOptions = {}) {
  return formatWithLimits({
    value,
    limits: {
      ...DEFAULT_LIMITS,
      ...options
    }
  });
}

export function promisify(run: (...args: unknown[]) => void) {
  return (...args: unknown[]) => new Promise((resolve, reject) => {
    function callback(...[error, value]: Parameters<Callback>) {
      return error ? reject(error) : resolve(value);
    }

    run(...args, callback);
  });
}

function format(...values: unknown[]) {
  return values.map(value => (typeof value === "string" ? value : inspect(value))).join(" ");
}

const api = {
  inspect,
  promisify,
  format,
  TextEncoder,
  TextDecoder
};

export const nodeUtil = {
  ...api,
  default: api
};
