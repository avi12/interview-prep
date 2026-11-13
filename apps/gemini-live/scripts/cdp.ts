import { zod } from "#src/lib/zod.ts";

const messageSchema = zod.object({
  id: zod.number().optional(),
  method: zod.string().optional(),
  params: zod.record(zod.string(), zod.unknown()).optional(),
  result: zod.unknown().optional(),
  error: zod.unknown().optional()
});

const targetSchema = zod.object({
  id: zod.string(),
  type: zod.string(),
  url: zod.string(),
  webSocketDebuggerUrl: zod.string()
});
export type CdpTarget = zod.infer<typeof targetSchema>;

const evaluateSchema = zod.object({
  result: zod.object({ value: zod.unknown().optional() }).optional(),
  exceptionDetails: zod
    .object({
      text: zod.string().optional(),
      exception: zod.object({ description: zod.string().optional() }).optional()
    })
    .optional()
});

export interface CdpEvent {
  method: string;
  params: Record<string, unknown>;
}

export interface Cdp {
  send: (method: string, params?: object) => Promise<unknown>;
  evaluate: (expression: string) => Promise<unknown>;
  on: (handler: (event: CdpEvent) => void) => void;
  close: () => void;
}

const CALL_TIMEOUT_MS = 20_000;
export const DEBUG_HOST = "127.0.0.1";

export function debugEndpoint(debugPort: number | string) {
  return `http://${DEBUG_HOST}:${debugPort}`;
}

export async function listTargets(debugPort: number | string) {
  const response = await fetch(`${debugEndpoint(debugPort)}/json/list`).catch(() => null);
  const listed = zod
    .array(zod.unknown())
    .catch([])
    .parse(await response?.json().catch(() => null));
  return listed.flatMap(item => {
    const parsed = targetSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function connect(wsUrl: string) {
  const socket = new WebSocket(wsUrl);
  let lastId = 0;
  const pending = new Map<number, (result: unknown) => void>();
  const handlers: ((event: CdpEvent) => void)[] = [];
  socket.onmessage = message => {
    const parsed = messageSchema.safeParse(JSON.parse(String(message.data)));
    if (!parsed.success) {
      return;
    }

    const { id, method, params = {}, result, error } = parsed.data;
    const resolve = id === undefined ? undefined : pending.get(id);
    const isPendingReply = id !== undefined && resolve;
    if (isPendingReply) {
      resolve(error ? { error } : result);
      pending.delete(id);
      return;
    }

    if (method) {
      for (const handler of handlers) {
        handler({
          method,
          params
        });
      }
    }
  };
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  function send(method: string, params: object = {}) {
    return new Promise<unknown>((resolve, reject) => {
      const id = ++lastId;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), CALL_TIMEOUT_MS);
      pending.set(id, result => {
        clearTimeout(timer);
        resolve(result);
      });
      socket.send(
        JSON.stringify({
          id,
          method,
          params
        })
      );
    });
  }

  async function evaluate(expression: string) {
    const evaluated = evaluateSchema.safeParse(
      await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true
      })
    );
    if (!evaluated.success) {
      return undefined;
    }

    const { result, exceptionDetails } = evaluated.data;
    if (exceptionDetails) {
      return `EXC: ${exceptionDetails.exception?.description ?? exceptionDetails.text}`;
    }

    return result?.value;
  }

  return {
    send,
    evaluate,
    on: handler => handlers.push(handler),
    close: () => socket.close()
  } satisfies Cdp;
}
