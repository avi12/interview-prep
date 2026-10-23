import type { CheckResult } from "../starter/extract.ts";
import { FakeModel, textTurn } from "#kit/fakeModel.ts";
import type { Message, MessageRequest, MessagesClient } from "#kit/fakeModel.ts";
import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";
import { z } from "zod";

type Module = {
  ExtractionError: new (input: {
    attempts: number;
    lastProblem: string;
  }) => Error & {
    attempts: number;
    lastProblem: string;
  };
  checkReply: (input: {
    reply: string;
    schema: z.ZodType;
  }) => CheckResult<unknown>;
  extractWithRetry: (input: {
    client: MessagesClient;
    text: string;
    schema: z.ZodType;
    maxAttempts: number;
  }) => Promise<{
    data: unknown;
    attempts: number;
  }>;
};

const { ExtractionError, checkReply, extractWithRetry } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "extract.ts"
});

function problemOf(result: CheckResult<unknown>) {
  return result.isValid ? "" : result.problem;
}

const Invoice = z.object({
  vendor: z.string().min(1),
  total: z.number().positive(),
  currency: z.enum(["USD", "EUR", "ILS"]).default("USD")
});

const Person = z.object({
  name: z.string(),
  age: z.number().int().nonnegative()
});

const INVOICE_TEXT = "Invoice from Acme Ltd, total 42.50 dollars.";
const VALID_INVOICE = "{\"vendor\":\"Acme Ltd\",\"total\":42.5,\"currency\":\"USD\"}";
const STRING_TOTAL = "{\"vendor\":\"Acme Ltd\",\"total\":\"42.50\",\"currency\":\"USD\"}";
const MAX_ATTEMPTS = 3;

function textOfMessage(message: Message) {
  return typeof message.content === "string"
    ? message.content
    : message.content.map(block => (block.type === "text" ? block.text : "")).join("\n");
}

function lastMessageText(request: MessageRequest) {
  return textOfMessage(request.messages.at(-1)!);
}

describe("checkReply", () => {
  it("accepts a reply that matches the schema", () => {
    const result = checkReply({
      reply: VALID_INVOICE,
      schema: Invoice
    });
    expect(result).toEqual({
      isValid: true,
      data: {
        vendor: "Acme Ltd",
        total: 42.5,
        currency: "USD"
      }
    });
  });

  it("accepts JSON wrapped in a markdown code fence", () => {
    const result = checkReply({
      reply: "```json\n" + VALID_INVOICE + "\n```",
      schema: Invoice
    });
    expect(result.isValid).toBe(true);
  });

  it("returns the parsed zod output, so defaults are applied", () => {
    const result = checkReply({
      reply: "{\"vendor\":\"Acme\",\"total\":10}",
      schema: Invoice
    });
    expect(result).toEqual({
      isValid: true,
      data: {
        vendor: "Acme",
        total: 10,
        currency: "USD"
      }
    });
  });

  it("explains that the reply was not JSON", () => {
    const result = checkReply({
      reply: "Sure! Here is the invoice you asked for.",
      schema: Invoice
    });
    expect(result.isValid).toBe(false);
    expect(problemOf(result)).toMatch(/JSON/i);
  });

  it("names the field and the mismatch when a type is wrong", () => {
    const result = checkReply({
      reply: STRING_TOTAL,
      schema: Invoice
    });
    expect(result.isValid).toBe(false);
    const problem = problemOf(result);
    expect(problem).toContain("total");
    expect(problem).toContain("expected number");
  });

  it("names a missing field", () => {
    const result = checkReply({
      reply: "{\"total\":5}",
      schema: Invoice
    });
    expect(result.isValid).toBe(false);
    expect(problemOf(result)).toContain("vendor");
  });

  it("rejects valid JSON that is not an object", () => {
    const result = checkReply({
      reply: "42",
      schema: Invoice
    });
    expect(result.isValid).toBe(false);
  });

  it("works with a different schema", () => {
    expect(
      checkReply({
        reply: "{\"name\":\"Dana\",\"age\":31}",
        schema: Person
      }).isValid
    ).toBe(true);
    const bad = checkReply({
      reply: "{\"name\":\"Dana\",\"age\":3.5}",
      schema: Person
    });
    expect(bad.isValid).toBe(false);
    expect(problemOf(bad)).toContain("age");
  });
});

describe("extractWithRetry", () => {
  it("returns the data after one call when the first reply is valid", async () => {
    const fake = new FakeModel([textTurn({ text: VALID_INVOICE })]);
    const result = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(result).toEqual({
      data: {
        vendor: "Acme Ltd",
        total: 42.5,
        currency: "USD"
      },
      attempts: 1
    });
    expect(fake.callCount).toBe(1);
  });

  it("sends the source text as the first user message and describes the JSON in the system prompt", async () => {
    const fake = new FakeModel([textTurn({ text: VALID_INVOICE })]);
    await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    const [request] = fake.requests;
    expect(request.messages).toEqual([{
      role: "user",
      content: INVOICE_TEXT
    }]);
    expect(request.system).toContain("JSON");
    expect(request.system).toContain("vendor");
  });

  it("retries after an invalid reply and returns the corrected data", async () => {
    const fake = new FakeModel([textTurn({ text: STRING_TOTAL }), textTurn({ text: VALID_INVOICE })]);
    const result = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(result.attempts).toBe(2);
    expect(result.data).toMatchObject({ total: 42.5 });
  });

  it("feeds the bad reply and the exact problem back to the model", async () => {
    const fake = new FakeModel([textTurn({ text: STRING_TOTAL }), textTurn({ text: VALID_INVOICE })]);
    await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    const retryMessages = fake.requests[1].messages;
    expect(retryMessages.map(message => message.role)).toEqual(["user", "assistant", "user"]);
    expect(textOfMessage(retryMessages[1])).toBe(STRING_TOTAL);
    expect(textOfMessage(retryMessages[2])).toContain("total");
    expect(textOfMessage(retryMessages[2])).toContain("expected number");
  });

  it("keeps the system prompt on every attempt", async () => {
    const fake = new FakeModel([textTurn({ text: STRING_TOTAL }), textTurn({ text: VALID_INVOICE })]);
    await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(fake.requests[1].system).toBe(fake.requests[0].system);
    expect(fake.requests[1].system).toContain("vendor");
  });

  it("tells the model when its reply was not JSON at all", async () => {
    const fake = new FakeModel([textTurn({ text: "Here you go, friend!" }), textTurn({ text: VALID_INVOICE })]);
    await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(lastMessageText(fake.requests[1])).toMatch(/JSON/i);
  });

  it("recovers from an answer cut off by max_tokens", async () => {
    const fake = new FakeModel([
      textTurn({
        text: "{\"vendor\":\"Acme Ltd\",\"tot",
        stopReason: "max_tokens"
      }),
      textTurn({ text: VALID_INVOICE })
    ]);
    const result = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(result.attempts).toBe(2);
  });

  it("keeps the whole history on a third attempt", async () => {
    const fake = new FakeModel([textTurn({ text: "nope" }), textTurn({ text: STRING_TOTAL }), textTurn({ text: VALID_INVOICE })]);
    const result = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(result.attempts).toBe(3);
    expect(fake.requests[2].messages.map(message => message.role)).toEqual(["user", "assistant", "user", "assistant", "user"]);
  });

  it("stops calling the model after success", async () => {
    const fake = new FakeModel([textTurn({ text: VALID_INVOICE }), textTurn({ text: VALID_INVOICE })]);
    await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    });
    expect(fake.remainingTurns).toBe(1);
  });

  it("gives up with an ExtractionError after exactly maxAttempts calls", async () => {
    const fake = FakeModel.always(textTurn({ text: STRING_TOTAL }));
    const error = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: MAX_ATTEMPTS
    }).catch(caught => caught);
    expect(error).toBeInstanceOf(ExtractionError);
    expect(error.attempts).toBe(MAX_ATTEMPTS);
    expect(error.lastProblem).toContain("total");
    expect(fake.callCount).toBe(MAX_ATTEMPTS);
  });

  it("makes a single call when maxAttempts is 1", async () => {
    const fake = FakeModel.always(textTurn({ text: "not json" }));
    const error = await extractWithRetry({
      client: fake,
      text: INVOICE_TEXT,
      schema: Invoice,
      maxAttempts: 1
    }).catch(caught => caught);
    expect(error).toBeInstanceOf(ExtractionError);
    expect(fake.callCount).toBe(1);
  });

  it("works with another schema and another text", async () => {
    const fake = new FakeModel([textTurn({ text: "{\"name\":\"Dana\",\"age\":\"31\"}" }), textTurn({ text: "{\"name\":\"Dana\",\"age\":31}" })]);
    const result = await extractWithRetry({
      client: fake,
      text: "Dana is thirty-one.",
      schema: Person,
      maxAttempts: 2
    });
    expect(result).toEqual({
      data: {
        name: "Dana",
        age: 31
      },
      attempts: 2
    });
    expect(lastMessageText(fake.requests[1])).toContain("age");
  });
});
