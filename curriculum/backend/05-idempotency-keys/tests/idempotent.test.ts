import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { createGate, nextTick } from "#kit/async.ts";

type Response = { status: number; headers?: Record<string, string>; body?: any };
type Handler = (request: { body: unknown }) => Promise<Response>;
type Module = {
  createIdempotentHandler: (input: { handler: Handler }) => (request: { headers: Record<string, string>; body: unknown }) => Promise<Response>;
};

const { createIdempotentHandler } = await loadImpl<Module>({ testUrl: import.meta.url, file: "idempotent.ts" });

const KEY_HEADER = "idempotency-key";
const PAYMENT = { amount: 1000, currency: "usd" };

const settledWithinTick = <T>(promise: Promise<T>) =>
  Promise.race([promise, nextTick().then(() => undefined)]);

const setup = (options: { respond?: (count: number) => Response | Promise<Response>; gate?: Promise<void> } = {}) => {
  let chargeCount = 0;
  const handler: Handler = async ({ body }) => {
    chargeCount += 1;
    const count = chargeCount;
    await options.gate;
    if (options.respond) return options.respond(count);
    return { status: 201, body: { id: `pay_${count}`, ...(body as object) } };
  };
  const handle = createIdempotentHandler({ handler });
  const send = ({ key, body = PAYMENT }: { key?: string; body?: unknown }) =>
    handle({ headers: key ? { [KEY_HEADER]: key } : {}, body });
  return { send, charges: () => chargeCount };
};

describe("the Idempotency-Key header", () => {
  it("a request without the header is 400 and nothing is charged", async () => {
    const { send, charges } = setup();
    const response = await send({});
    expect(response.status).toBe(400);
    expect(charges()).toBe(0);
  });

  it("the first request with a key runs the handler once and returns its response", async () => {
    const { send, charges } = setup();
    const response = await send({ key: "k1" });
    expect(response).toMatchObject({ status: 201, body: { id: "pay_1", amount: 1000 } });
    expect(response.headers?.["idempotent-replayed"]).toBeUndefined();
    expect(charges()).toBe(1);
  });
});

describe("retries with the same key", () => {
  it("replay the saved response and never run the handler again", async () => {
    const { send, charges } = setup();
    const first = await send({ key: "k1" });
    const retry = await send({ key: "k1" });
    expect(retry.status).toBe(first.status);
    expect(retry.body).toEqual(first.body);
    expect(retry.headers?.["idempotent-replayed"]).toBe("true");
    expect(charges()).toBe(1);
  });

  it("replay without changing the original response, so every retry looks the same", async () => {
    const { send } = setup();
    const first = await send({ key: "k1" });
    const secondRetry = await (async () => {
      await send({ key: "k1" });
      return send({ key: "k1" });
    })();
    expect(first.headers?.["idempotent-replayed"]).toBeUndefined();
    expect(secondRetry.headers?.["idempotent-replayed"]).toBe("true");
    expect(secondRetry.body).toEqual(first.body);
  });

  it("replay the original answer even after other payments happened", async () => {
    const { send } = setup();
    await send({ key: "a" });
    await send({ key: "b" });
    const retryOfA = await send({ key: "a" });
    expect(retryOfA.body.id).toBe("pay_1");
  });

  it("replay a failure response too: a declined card is answered again, not retried", async () => {
    const { send, charges } = setup({ respond: () => ({ status: 402, body: { error: "card_declined" } }) });
    await send({ key: "k1" });
    const retry = await send({ key: "k1" });
    expect(retry).toMatchObject({ status: 402, body: { error: "card_declined" } });
    expect(charges()).toBe(1);
  });

  it("see the same request even when the JSON properties arrive in another order", async () => {
    const { send, charges } = setup();
    await send({ key: "k1", body: { amount: 1000, currency: "usd" } });
    const retry = await send({ key: "k1", body: { currency: "usd", amount: 1000 } });
    expect(retry.status).toBe(201);
    expect(retry.headers?.["idempotent-replayed"]).toBe("true");
    expect(charges()).toBe(1);
  });
});

describe("different keys, different requests", () => {
  it("a new key means a new payment, even with an identical body", async () => {
    const { send, charges } = setup();
    const first = await send({ key: "k1" });
    const second = await send({ key: "k2" });
    expect(second.body.id).not.toBe(first.body.id);
    expect(charges()).toBe(2);
  });

  it("the same key with a different body is 422 and does not replay or charge", async () => {
    const { send, charges } = setup();
    await send({ key: "k1", body: PAYMENT });
    const misuse = await send({ key: "k1", body: { amount: 9999, currency: "usd" } });
    expect(misuse.status).toBe(422);
    expect(misuse.body.id).toBeUndefined();
    expect(charges()).toBe(1);
  });

  it("two handlers do not share saved keys", async () => {
    const one = setup();
    const two = setup();
    await one.send({ key: "k1" });
    await two.send({ key: "k1" });
    expect(two.charges()).toBe(1);
  });
});

describe("a retry that arrives while the first request is still running", () => {
  it("gets 409 and the handler runs only once", async () => {
    const { promise: opened, release: open } = createGate();
    const { send, charges } = setup({ gate: opened });
    const first = send({ key: "k1" });
    const duplicate = await settledWithinTick(send({ key: "k1" }));
    open();
    expect((await first).status).toBe(201);
    expect(duplicate?.status).toBe(409);
    expect(charges()).toBe(1);
  });

  it("once the first request finishes, the same key replays its answer", async () => {
    const { promise: opened, release: open } = createGate();
    const { send, charges } = setup({ gate: opened });
    const first = send({ key: "k1" });
    await settledWithinTick(send({ key: "k1" }));
    open();
    const original = await first;
    const later = await send({ key: "k1" });
    expect(later.body).toEqual(original.body);
    expect(charges()).toBe(1);
  });

  it("two truly simultaneous requests charge once", async () => {
    const { promise: opened, release: open } = createGate();
    const { send, charges } = setup({ gate: opened });
    const both = Promise.all([send({ key: "k1" }), send({ key: "k1" })]);
    open();
    const statuses = (await both).map(response => response.status).sort();
    expect(statuses).toEqual([201, 409]);
    expect(charges()).toBe(1);
  });
});

describe("when the handler crashes", () => {
  it("the key is released, so the client can retry and the work runs again", async () => {
    let attempts = 0;
    const { send, charges } = setup({
      respond: () => {
        attempts += 1;
        if (attempts === 1) throw new Error("database went away");
        return { status: 201, body: { id: "pay_ok" } };
      }
    });
    await expect(send({ key: "k1" })).rejects.toThrow("database went away");
    const retry = await send({ key: "k1" });
    expect(retry).toMatchObject({ status: 201, body: { id: "pay_ok" } });
    expect(charges()).toBe(2);
  });
});
