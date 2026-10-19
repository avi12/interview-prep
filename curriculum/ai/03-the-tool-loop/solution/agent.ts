import type { AssistantBlock, Message, MessagesClient, ToolDefinition, ToolResultBlock, ToolUseBlock } from "#kit/fakeModel.ts";

export type AgentTool = ToolDefinition & { run: (input: Record<string, unknown>) => unknown };

export class MaxIterationsError extends Error {
  readonly iterations: number;

  constructor(iterations: number) {
    super(`The model was still asking for tools after ${iterations} model calls`);
    this.name = "MaxIterationsError";
    this.iterations = iterations;
  }
}

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 1024;

export const toResultText = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

export const textOf = (blocks: AssistantBlock[]) =>
  blocks.flatMap(block => (block.type === "text" ? [block.text] : [])).join("");

const isToolUse = (block: AssistantBlock): block is ToolUseBlock => block.type === "tool_use";

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

const errorResult = ({ block, message }: { block: ToolUseBlock; message: string }): ToolResultBlock => ({
  type: "tool_result",
  tool_use_id: block.id,
  content: message,
  is_error: true
});

export async function runTool({ tools, block }: { tools: AgentTool[]; block: ToolUseBlock }): Promise<ToolResultBlock> {
  const tool = tools.find(candidate => candidate.name === block.name);
  if (!tool) {
    const available = tools.map(candidate => candidate.name).join(", ");
    return errorResult({ block, message: `Unknown tool: ${block.name}. Available tools: ${available}` });
  }
  try {
    const output = await tool.run(block.input);
    return { type: "tool_result", tool_use_id: block.id, content: toResultText(output) };
  } catch (error) {
    return errorResult({ block, message: `Error: ${messageOf(error)}` });
  }
}

export async function runAgent({
  client,
  system,
  task,
  tools,
  maxIterations
}: {
  client: MessagesClient;
  system?: string;
  task: string;
  tools: AgentTool[];
  maxIterations: number;
}): Promise<{ answer: string; iterations: number }> {
  const definitions = tools.map(({ run, ...definition }): ToolDefinition => definition);
  const messages: Message[] = [{ role: "user", content: task }];
  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      ...(system ? { system } : {}),
      tools: definitions,
      messages
    });
    if (response.stop_reason !== "tool_use") return { answer: textOf(response.content), iterations: iteration };
    const results = await Promise.all(response.content.filter(isToolUse).map(block => runTool({ tools, block })));
    messages.push({ role: "assistant", content: response.content }, { role: "user", content: results });
  }
  throw new MaxIterationsError(maxIterations);
}
