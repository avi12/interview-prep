import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { FakeModel, failTurn, textTurn } from "#kit/fakeModel.ts";
import type { AssistantBlock, Message, MessageRequest, MessageResponse, MessagesClient, StopReason, Usage } from "#kit/fakeModel.ts";
import type { Prices, RequestInput } from "../starter/llmApi.ts";

type Module = {
  buildRequest: (input: RequestInput) => MessageRequest;
  readResponse: (response: MessageResponse) => { text: string; stopReason: string; isTruncated: boolean };
  costOf: (input: { usage: Usage; prices: Prices }) => number;
  ask: (input: RequestInput & { client: MessagesClient; prices: Prices }) => Promise<{ text: string; stopReason: string; isTruncated: boolean; costUsd: number }>;
};

const { buildRequest, readResponse, costOf, ask } = await loadImpl<Module>({ testUrl: import.meta.url, file: "llmApi.ts" });

const PRICES: Prices = { inputPerMillion: 2, outputPerMillion: 10, cacheWritePerMillion: 2.5, cacheReadPerMillion: 0.1 };
const DIGITS = 10;

const responseWith = ({ content, stopReason = "end_turn" }: { content: AssistantBlock[]; stopReason?: StopReason }): MessageResponse => ({
  id: "msg_test",
  type: "message",
  role: "assistant",
  model: "fake-model",
  content,
  stop_reason: stopReason,
  stop_sequence: null,
  usage: { input_tokens: 1, output_tokens: 1 }
});

describe("buildRequest", () => {
  it("puts the system prompt in the top-level system field, not in messages", () => {
    const request = buildRequest({ model: "m", system: "Be brief.", userText: "Hi", maxTokens: 100 });
    expect(request.system).toBe("Be brief.");
    expect(request.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(request.messages.some(message => (message.role as string) === "system")).toBe(false);
  });

  it("uses the API field names model and max_tokens", () => {
    const request = buildRequest({ model: "some-model", userText: "Hi", maxTokens: 321 });
    expect(request.model).toBe("some-model");
    expect(request.max_tokens).toBe(321);
  });

  it("keeps the history in order and puts the new user message last", () => {
    const history: Message[] = [
      { role: "user", content: "What is a token?" },
      { role: "assistant", content: "A chunk of text." }
    ];
    const request = buildRequest({ model: "m", history, userText: "How big?", maxTokens: 50 });
    expect(request.messages).toEqual([...history, { role: "user", content: "How big?" }]);
  });

  it("does not change the history it was given", () => {
    const history = Object.freeze([{ role: "user", content: "First" }, { role: "assistant", content: "Reply" }] as Message[]) as Message[];
    expect(() => buildRequest({ model: "m", history, userText: "Next", maxTokens: 50 })).not.toThrow();
    expect(history).toHaveLength(2);
  });

  it("sends stop_sequences only when there are some", () => {
    const withStops = buildRequest({ model: "m", userText: "Hi", maxTokens: 50, stopSequences: ["END"] });
    const withoutStops = buildRequest({ model: "m", userText: "Hi", maxTokens: 50 });
    expect(withStops.stop_sequences).toEqual(["END"]);
    expect(withoutStops.stop_sequences ?? []).toEqual([]);
  });

  it("leaves out system when none is given", () => {
    const request = buildRequest({ model: "m", userText: "Hi", maxTokens: 50 });
    expect(request.system).toBeUndefined();
  });
});

describe("readResponse", () => {
  it("joins all text blocks and skips blocks that are not text", () => {
    const response = responseWith({
      content: [
        { type: "text", text: "Hello" },
        { type: "tool_use", id: "toolu_1", name: "lookup", input: {} },
        { type: "text", text: ", world" }
      ]
    });
    expect(readResponse(response).text).toBe("Hello, world");
  });

  it("returns an empty string when there is no text", () => {
    expect(readResponse(responseWith({ content: [] })).text).toBe("");
  });

  it("flags a max_tokens stop as truncated", () => {
    const truncated = readResponse(responseWith({ content: [{ type: "text", text: "A tok" }], stopReason: "max_tokens" }));
    expect(truncated.isTruncated).toBe(true);
    expect(truncated.stopReason).toBe("max_tokens");
  });

  it("does not flag a normal finish as truncated", () => {
    const finished = readResponse(responseWith({ content: [{ type: "text", text: "Done." }], stopReason: "end_turn" }));
    expect(finished.isTruncated).toBe(false);
    expect(finished.stopReason).toBe("end_turn");
  });

  it("flags only max_tokens as truncated, not other early stops", () => {
    const stopReasons: StopReason[] = ["stop_sequence", "tool_use", "refusal", "pause_turn"];
    for (const stopReason of stopReasons) {
      const result = readResponse(responseWith({ content: [{ type: "text", text: "Partial" }], stopReason }));
      expect(result.isTruncated, stopReason).toBe(false);
      expect(result.stopReason).toBe(stopReason);
    }
  });
});

describe("costOf", () => {
  it("prices input and output tokens per million", () => {
    const cost = costOf({ usage: { input_tokens: 2000, output_tokens: 500 }, prices: PRICES });
    expect(cost).toBeCloseTo(0.009, DIGITS);
  });

  it("prices cache writes and cache reads with their own rates", () => {
    const usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 1000, cache_read_input_tokens: 10_000 };
    expect(costOf({ usage, prices: PRICES })).toBeCloseTo(0.0042, DIGITS);
  });

  it("treats null or missing cache fields as zero tokens", () => {
    const withNulls = { input_tokens: 1000, output_tokens: 100, cache_creation_input_tokens: null, cache_read_input_tokens: null };
    const withoutFields = { input_tokens: 1000, output_tokens: 100 };
    expect(costOf({ usage: withNulls, prices: PRICES })).toBeCloseTo(0.003, DIGITS);
    expect(costOf({ usage: withoutFields, prices: PRICES })).toBeCloseTo(0.003, DIGITS);
  });

  it("scales with a different price table", () => {
    const expensive = { inputPerMillion: 10, outputPerMillion: 50, cacheWritePerMillion: 12.5, cacheReadPerMillion: 0.25 };
    expect(costOf({ usage: { input_tokens: 1_000_000, output_tokens: 1_000_000 }, prices: expensive })).toBeCloseTo(60, DIGITS);
  });
});

describe("ask", () => {
  it("sends a valid request and returns the text with its cost", async () => {
    const fake = new FakeModel([textTurn({ text: "A chunk of text.", usage: { input_tokens: 2000, output_tokens: 500 } })]);
    const result = await ask({ client: fake, model: "fake-model", system: "Be brief.", userText: "What is a token?", maxTokens: 200, prices: PRICES });
    expect(result.text).toBe("A chunk of text.");
    expect(result.isTruncated).toBe(false);
    expect(result.costUsd).toBeCloseTo(0.009, DIGITS);
    expect(fake.requests[0]).toMatchObject({
      model: "fake-model",
      max_tokens: 200,
      system: "Be brief.",
      messages: [{ role: "user", content: "What is a token?" }]
    });
  });

  it("reports a cut-off answer as truncated", async () => {
    const fake = new FakeModel([textTurn({ text: "A chunk of te", stopReason: "max_tokens" })]);
    const result = await ask({ client: fake, model: "fake-model", userText: "What is a token?", maxTokens: 5, prices: PRICES });
    expect(result.isTruncated).toBe(true);
    expect(result.stopReason).toBe("max_tokens");
  });

  it("includes cache tokens in the cost", async () => {
    const usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 1000, cache_read_input_tokens: 10_000 };
    const fake = new FakeModel([textTurn({ text: "Cached.", usage })]);
    const result = await ask({ client: fake, model: "fake-model", userText: "Again?", maxTokens: 100, prices: PRICES });
    expect(result.costUsd).toBeCloseTo(0.0042, DIGITS);
  });

  it("replays the history so the model sees the whole conversation", async () => {
    const history: Message[] = [
      { role: "user", content: "What is a token?" },
      { role: "assistant", content: "A chunk of text." }
    ];
    const fake = new FakeModel([textTurn({ text: "About four characters." })]);
    await ask({ client: fake, model: "fake-model", history, userText: "How big is one?", maxTokens: 100, prices: PRICES });
    expect(fake.requests[0].messages).toEqual([...history, { role: "user", content: "How big is one?" }]);
  });

  it("lets an API error reach the caller", async () => {
    const fake = new FakeModel([failTurn({ status: 529, message: "Overloaded" })]);
    await expect(ask({ client: fake, model: "fake-model", userText: "Hi", maxTokens: 10, prices: PRICES })).rejects.toMatchObject({ status: 529 });
  });
});
