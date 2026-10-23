import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";
import { FakeModel, textTurn, toolUseTurn } from "#kit/fakeModel.ts";
import type { Message, MessageRequest, MessagesClient, ToolResultBlock, ToolUseBlock } from "#kit/fakeModel.ts";
import type { AgentTool } from "../starter/agent.ts";

type Module = {
  MaxIterationsError: new (iterations: number) => Error & { iterations: number };
  runTool: (input: { tools: AgentTool[]; block: ToolUseBlock }) => Promise<ToolResultBlock>;
  runAgent: (input: { client: MessagesClient; system?: string; task: string; tools: AgentTool[]; maxIterations: number }) => Promise<{ answer: string; iterations: number }>;
};

const { MaxIterationsError, runTool, runAgent } = await loadImpl<Module>({ testUrl: import.meta.url, file: "agent.ts" });

const MAX_ITERATIONS = 5;
const OBJECT_SCHEMA = { type: "object" as const, properties: { order_id: { type: "string" } }, required: ["order_id"] };

const makeTool = ({ name, run }: { name: string; run: AgentTool["run"] }): AgentTool => ({
  name,
  description: `Test tool ${name}`,
  input_schema: OBJECT_SCHEMA,
  run
});

const useBlock = ({ id, name, input }: { id: string; name: string; input: Record<string, unknown> }): ToolUseBlock => ({ type: "tool_use", id, name, input });

const contentOf = (message: Message) => (typeof message.content === "string" ? [] : message.content);

const toolResultsOf = (request: MessageRequest) =>
  contentOf(request.messages.at(-1)!).filter((block): block is ToolResultBlock => block.type === "tool_result");

describe("runTool", () => {
  it("runs the named tool with the model's input and returns a matching tool_result", async () => {
    const inputs: Record<string, unknown>[] = [];
    const tools = [makeTool({ name: "lookup_order", run: input => (inputs.push(input), "shipped") })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_1", name: "lookup_order", input: { order_id: "A17" } }) });
    expect(inputs).toEqual([{ order_id: "A17" }]);
    expect(result).toMatchObject({ type: "tool_result", tool_use_id: "toolu_1", content: "shipped" });
    expect(result.is_error).toBeFalsy();
  });

  it("turns an object result into JSON text", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => ({ status: "shipped", items: 2 }) })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_2", name: "lookup_order", input: {} }) });
    expect(JSON.parse(result.content as string)).toEqual({ status: "shipped", items: 2 });
  });

  it("waits for an async tool", async () => {
    const tools = [makeTool({ name: "lookup_order", run: async () => "late answer" })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_3", name: "lookup_order", input: {} }) });
    expect(result.content).toBe("late answer");
  });

  it("returns a thrown error as an is_error result instead of throwing", async () => {
    const tools = [makeTool({ name: "issue_refund", run: () => { throw new Error("Order Z99 not found"); } })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_4", name: "issue_refund", input: {} }) });
    expect(result.tool_use_id).toBe("toolu_4");
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("Order Z99 not found");
  });

  it("returns an async rejection as an is_error result too", async () => {
    const tools = [makeTool({ name: "issue_refund", run: async () => Promise.reject(new Error("payment service down")) })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_5", name: "issue_refund", input: {} }) });
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("payment service down");
  });

  it("answers an unknown tool name with an is_error result that names it", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "x" })];
    const result = await runTool({ tools, block: useBlock({ id: "toolu_6", name: "delete_everything", input: {} }) });
    expect(result.tool_use_id).toBe("toolu_6");
    expect(result.is_error).toBe(true);
    expect(result.content).toContain("delete_everything");
  });
});

describe("runAgent", () => {
  it("returns the answer after one call when no tool is needed", async () => {
    const calls: unknown[] = [];
    const tools = [makeTool({ name: "lookup_order", run: input => (calls.push(input), "x") })];
    const fake = new FakeModel([textTurn({ text: "Hello! How can I help?" })]);
    const result = await runAgent({ client: fake, task: "Say hello", tools, maxIterations: MAX_ITERATIONS });
    expect(result).toEqual({ answer: "Hello! How can I help?", iterations: 1 });
    expect(calls).toHaveLength(0);
  });

  it("sends the task, the system prompt and the tool definitions without the run function", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "x" }), makeTool({ name: "issue_refund", run: () => "y" })];
    const fake = new FakeModel([textTurn({ text: "Done" })]);
    await runAgent({ client: fake, system: "You are a support agent.", task: "Where is A17?", tools, maxIterations: MAX_ITERATIONS });
    const [request] = fake.requests;
    expect(request.system).toBe("You are a support agent.");
    expect(request.messages).toEqual([{ role: "user", content: "Where is A17?" }]);
    expect(request.tools?.map(tool => tool.name)).toEqual(["lookup_order", "issue_refund"]);
    expect(request.tools?.[0]).toEqual({ name: "lookup_order", description: "Test tool lookup_order", input_schema: OBJECT_SCHEMA });
  });

  it("runs the tool the model asked for and gives the result back to the model", async () => {
    const inputs: unknown[] = [];
    const tools = [makeTool({ name: "lookup_order", run: input => (inputs.push(input), { status: "shipped" }) })];
    const fake = new FakeModel([
      toolUseTurn({ text: "Let me look that up.", calls: [{ name: "lookup_order", input: { order_id: "A17" } }] }),
      request => textTurn({ text: `Your order is ${JSON.parse(toolResultsOf(request)[0].content as string).status}.` })
    ]);
    const result = await runAgent({ client: fake, task: "Where is order A17?", tools, maxIterations: MAX_ITERATIONS });
    expect(inputs).toEqual([{ order_id: "A17" }]);
    expect(result).toEqual({ answer: "Your order is shipped.", iterations: 2 });
  });

  it("appends the model's whole turn, unchanged, before the tool results", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "ok" })];
    const fake = new FakeModel([
      toolUseTurn({ text: "Checking.", calls: [{ name: "lookup_order", input: { order_id: "A17" } }] }),
      textTurn({ text: "Done" })
    ]);
    await runAgent({ client: fake, task: "Where is A17?", tools, maxIterations: MAX_ITERATIONS });
    const secondRequest = fake.requests[1];
    expect(secondRequest.messages.map(message => message.role)).toEqual(["user", "assistant", "user"]);
    expect(secondRequest.messages[1].content).toEqual(fake.responses[0].content);
    const [toolUse] = fake.responses[0].content.filter(block => block.type === "tool_use");
    expect(toolResultsOf(secondRequest)).toMatchObject([{ tool_use_id: (toolUse as ToolUseBlock).id }]);
  });

  it("chains two different tools across several model calls", async () => {
    const order: string[] = [];
    const tools = [
      makeTool({ name: "lookup_order", run: () => (order.push("lookup"), { status: "delivered", total: 40 }) }),
      makeTool({ name: "issue_refund", run: () => (order.push("refund"), "refund issued") })
    ];
    const fake = new FakeModel([
      toolUseTurn({ calls: [{ name: "lookup_order", input: { order_id: "B2" } }] }),
      toolUseTurn({ calls: [{ name: "issue_refund", input: { order_id: "B2" } }] }),
      textTurn({ text: "Refund issued for order B2." })
    ]);
    const result = await runAgent({ client: fake, task: "Refund order B2", tools, maxIterations: MAX_ITERATIONS });
    expect(order).toEqual(["lookup", "refund"]);
    expect(result).toEqual({ answer: "Refund issued for order B2.", iterations: 3 });
    expect(fake.requests[2].messages).toHaveLength(5);
  });

  it("answers several tool calls from one turn in one user message, in order", async () => {
    const tools = [makeTool({ name: "lookup_order", run: input => `status of ${input.order_id}` })];
    const fake = new FakeModel([
      toolUseTurn({
        calls: [
          { name: "lookup_order", input: { order_id: "A1" } },
          { name: "lookup_order", input: { order_id: "A2" } }
        ]
      }),
      textTurn({ text: "Both checked." })
    ]);
    await runAgent({ client: fake, task: "Check A1 and A2", tools, maxIterations: MAX_ITERATIONS });
    const results = toolResultsOf(fake.requests[1]);
    expect(results.map(result => result.content)).toEqual(["status of A1", "status of A2"]);
    expect(fake.requests[1].messages).toHaveLength(3);
  });

  it("sends a tool error back to the model and keeps going", async () => {
    const tools = [makeTool({ name: "issue_refund", run: () => { throw new Error("Order Z99 not found"); } })];
    const fake = new FakeModel([
      toolUseTurn({ calls: [{ name: "issue_refund", input: { order_id: "Z99" } }] }),
      textTurn({ text: "I could not find that order." })
    ]);
    const result = await runAgent({ client: fake, task: "Refund Z99", tools, maxIterations: MAX_ITERATIONS });
    const [errorResult] = toolResultsOf(fake.requests[1]);
    expect(errorResult.is_error).toBe(true);
    expect(errorResult.content).toContain("Order Z99 not found");
    expect(result.answer).toBe("I could not find that order.");
  });

  it("survives a call to a tool that does not exist", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "x" })];
    const fake = new FakeModel([
      toolUseTurn({ calls: [{ name: "hack_the_planet", input: {} }] }),
      textTurn({ text: "Sorry, I cannot do that." })
    ]);
    const result = await runAgent({ client: fake, task: "Do something odd", tools, maxIterations: MAX_ITERATIONS });
    expect(toolResultsOf(fake.requests[1])[0].is_error).toBe(true);
    expect(result.iterations).toBe(2);
  });

  it("throws MaxIterationsError after exactly maxIterations model calls when the model never stops", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "still pending" })];
    const fake = FakeModel.always(toolUseTurn({ calls: [{ name: "lookup_order", input: { order_id: "A17" } }] }));
    const error = await runAgent({ client: fake, task: "Loop forever", tools, maxIterations: 4 }).catch(caught => caught);
    expect(error).toBeInstanceOf(MaxIterationsError);
    expect(error.iterations).toBe(4);
    expect(fake.callCount).toBe(4);
  });

  it("finishes on any stop reason other than tool_use", async () => {
    const tools = [makeTool({ name: "lookup_order", run: () => "x" })];
    const fake = FakeModel.always(textTurn({ text: "Cut off mid sen", stopReason: "max_tokens" }));
    const result = await runAgent({ client: fake, task: "Write a long story", tools, maxIterations: MAX_ITERATIONS });
    expect(result).toEqual({ answer: "Cut off mid sen", iterations: 1 });
  });
});
