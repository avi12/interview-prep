export interface CdpEvent {
  method: string;
  params: Record<string, any>;
}

export interface Cdp {
  send: (method: string, params?: object) => Promise<any>;
  ev: (expression: string) => Promise<any>;
  on: (handler: (event: CdpEvent) => void) => void;
  close: () => void;
}

const CALL_TIMEOUT_MS = 20_000;

export const connect = async (wsUrl: string): Promise<Cdp> => {
  const socket = new WebSocket(wsUrl);
  let lastId = 0;
  const pending = new Map<number, (result: any) => void>();
  const handlers: ((event: CdpEvent) => void)[] = [];
  socket.onmessage = message => {
    const data = JSON.parse(String(message.data));
    if (data.id && pending.has(data.id)) {
      pending.get(data.id)?.(data.error ? { error: data.error } : data.result);
      pending.delete(data.id);
      return;
    }
    if (data.method) for (const handler of handlers) handler(data);
  };
  await new Promise(resolve => (socket.onopen = resolve));

  const send = (method: string, params: object = {}) =>
    new Promise<any>((resolve, reject) => {
      const id = ++lastId;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), CALL_TIMEOUT_MS);
      pending.set(id, result => {
        clearTimeout(timer);
        resolve(result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const ev = async (expression: string) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return result?.exceptionDetails ? `EXC: ${result.exceptionDetails.exception?.description ?? result.exceptionDetails.text}` : result?.result?.value;
  };

  return { send, ev, on: handler => handlers.push(handler), close: () => socket.close() };
};
