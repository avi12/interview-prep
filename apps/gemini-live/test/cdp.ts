import { z } from "../src/lib/zod.ts";

const messageSchema = z.object({
  id: z.number().optional(),
  method: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
  result: z.unknown().optional(),
  error: z.unknown().optional()
});

const evaluateSchema = z.object({
  result: z.object({ value: z.unknown().optional() }).optional(),
  exceptionDetails: z.object({
    text: z.string().optional(),
    exception: z.object({ description: z.string().optional() }).optional()
  }).optional()
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

export async function connect(wsUrl: string): Promise<Cdp> {
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
    if (id !== undefined && resolve) {
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
  await new Promise(resolve => (socket.onopen = resolve));

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
  };
}
