import type { MessagesClient, ToolDefinition, ToolResultBlock, ToolUseBlock } from "#kit/fakeModel.ts";

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

export async function runTool({ tools, block }: { tools: AgentTool[]; block: ToolUseBlock }): Promise<ToolResultBlock> {
  return { type: "tool_result", tool_use_id: block.id, content: "" };
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
  return { answer: "", iterations: 0 };
}
