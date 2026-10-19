export type TextBlock = { type: "text"; text: string };
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content?: string; is_error?: boolean };
export type AssistantBlock = TextBlock | ToolUseBlock;
export type UserBlock = TextBlock | ToolResultBlock;
export type UserMessage = { role: "user"; content: string | UserBlock[] };
export type AssistantMessage = { role: "assistant"; content: string | AssistantBlock[] };
export type Message = UserMessage | AssistantMessage;

export type StopReason = "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | "pause_turn" | "refusal";

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

export type ToolDefinition = {
  name: string;
  description: string;
  input_schema: { type: "object"; properties?: Record<string, unknown>; required?: string[] };
  strict?: boolean;
};

export type MessageRequest = {
  model: string;
  max_tokens: number;
  messages: Message[];
  system?: string;
  tools?: ToolDefinition[];
  tool_choice?: { type: "auto" | "any" | "none" } | { type: "tool"; name: string };
  stop_sequences?: string[];
  temperature?: number;
};

export type MessageResponse = {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  content: AssistantBlock[];
  stop_reason: StopReason;
  stop_sequence: string | null;
  usage: Usage;
};

export type MessagesClient = {
  messages: { create: (request: MessageRequest) => Promise<MessageResponse> };
};

export type DraftToolUse = { type: "tool_use"; id?: string; name: string; input: Record<string, unknown> };
export type DraftBlock = TextBlock | DraftToolUse;

export type ReplyTurn = {
  kind: "reply";
  content: DraftBlock[];
  stopReason?: StopReason;
  stopSequence?: string;
  usage?: Partial<Usage>;
};
export type FailTurn = { kind: "fail"; status: number; message: string };
export type Turn = ReplyTurn | FailTurn;
export type TurnScript = Turn | ((request: MessageRequest) => Turn);

export type ToolCall = { name: string; input: Record<string, unknown>; id?: string };
type TurnOptions = Pick<ReplyTurn, "stopReason" | "stopSequence" | "usage">;

export type FakeModelOptions = {
  modelName?: string;
  contextWindowTokens?: number;
  isLastTurnRepeated?: boolean;
};

const CHARS_PER_TOKEN = 4;
const DEFAULT_MODEL_NAME = "fake-model";
const DEFAULT_CONTEXT_WINDOW_TOKENS = 1_000_000;
const BAD_REQUEST_STATUS = 400;
const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 1;
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const REQUEST_KEYS = new Set(["model", "max_tokens", "messages", "system", "tools", "tool_choice", "stop_sequences", "temperature"]);
const MESSAGE_KEYS = new Set(["role", "content"]);
const TOOL_KEYS = new Set(["name", "description", "input_schema", "strict", "input_examples"]);
const ROLES = new Set(["user", "assistant"]);

export class FakeApiError extends Error {
  readonly status: number;

  constructor({ status, message }: { status: number; message: string }) {
    super(message);
    this.name = "FakeApiError";
    this.status = status;
  }
}

export const estimateTokens = (value: unknown) => Math.ceil(JSON.stringify(value ?? "").length / CHARS_PER_TOKEN);

export const textTurn = ({ text, ...options }: { text: string } & TurnOptions): ReplyTurn => ({
  kind: "reply",
  content: [{ type: "text", text }],
  ...options
});

export const toolUseTurn = ({ calls, text, ...options }: { calls: ToolCall[]; text?: string } & TurnOptions): ReplyTurn => ({
  kind: "reply",
  content: [...(text ? [{ type: "text" as const, text }] : []), ...calls.map(call => ({ type: "tool_use" as const, ...call }))],
  ...options
});

export const failTurn = ({ status, message }: { status: number; message: string }): FailTurn => ({ kind: "fail", status, message });

const badRequest = (message: string) => new FakeApiError({ status: BAD_REQUEST_STATUS, message });

const blocksOf = (message: Message): { type: string; [key: string]: unknown }[] =>
  typeof message.content === "string" ? [] : message.content;

const toolUseIdsOf = (message: Message | undefined) =>
  message?.role === "assistant" ? blocksOf(message).flatMap(block => (block.type === "tool_use" ? [String(block.id)] : [])) : [];

const toolResultIdsOf = (message: Message) =>
  message.role === "user" ? blocksOf(message).flatMap(block => (block.type === "tool_result" ? [String(block.tool_use_id)] : [])) : [];

const assertKnownKeys = ({ value, allowed, path }: { value: object; allowed: Set<string>; path: string }) => {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw badRequest(`${path}${key}: Extra inputs are not permitted`);
  }
};

const assertContent = ({ message, index }: { message: Message; index: number }) => {
  if (typeof message.content === "string") {
    if (!message.content.trim()) throw badRequest(`messages.${index}: text content blocks must contain non-whitespace text`);
    return;
  }
  if (!Array.isArray(message.content) || message.content.length === 0) throw badRequest(`messages.${index}.content: must be a non-empty string or array of content blocks`);
  for (const block of message.content) {
    if (block.type === "text" && !block.text?.trim()) throw badRequest(`messages.${index}: text content blocks must contain non-whitespace text`);
  }
};

const assertMessages = (messages: unknown) => {
  if (!Array.isArray(messages) || messages.length === 0) throw badRequest("messages: Field required, and it must be a non-empty array");
  for (const [index, message] of (messages as Message[]).entries()) {
    assertKnownKeys({ value: message, allowed: MESSAGE_KEYS, path: `messages.${index}.` });
    if (!ROLES.has(message.role)) throw badRequest(`messages.${index}.role: Input should be 'user' or 'assistant'. The system prompt is the top-level "system" field, not a message`);
    assertContent({ message, index });
  }
  if ((messages as Message[])[0].role !== "user") throw badRequest("messages.0.role: the first message must use the 'user' role");
};

const assertEndsWithUser = (messages: Message[]) => {
  if (messages.at(-1)?.role !== "user") throw badRequest("This model does not support assistant message prefill. The conversation must end with a user message.");
};

const assertToolPairing = (messages: Message[]) => {
  for (const [index, message] of messages.entries()) {
    const expectedIds = toolUseIdsOf(messages[index - 1]);
    const resultIds = toolResultIdsOf(message);
    const unexpected = resultIds.filter(id => !expectedIds.includes(id));
    if (unexpected.length > 0) {
      throw badRequest(`messages.${index}.content: unexpected \`tool_use_id\` found in \`tool_result\` blocks: ${unexpected.join(", ")}. Each \`tool_result\` block must have a corresponding \`tool_use\` block in the previous message.`);
    }
    if (expectedIds.length === 0) continue;
    const missing = expectedIds.filter(id => !resultIds.includes(id));
    if (missing.length > 0) {
      throw badRequest(`messages.${index - 1}: \`tool_use\` ids were found without \`tool_result\` blocks immediately after: ${missing.join(", ")}. Each \`tool_use\` block must have a corresponding \`tool_result\` block in the next message.`);
    }
    const leadingBlocks = blocksOf(message).slice(0, expectedIds.length);
    if (!leadingBlocks.every(block => block.type === "tool_result")) {
      throw badRequest(`messages.${index}.content: \`tool_result\` blocks must come first in the content array, before any text.`);
    }
  }
  const trailingIds = toolUseIdsOf(messages.at(-1));
  if (trailingIds.length > 0) {
    throw badRequest(`messages.${messages.length - 1}: \`tool_use\` ids were found without \`tool_result\` blocks immediately after: ${trailingIds.join(", ")}. Each \`tool_use\` block must have a corresponding \`tool_result\` block in the next message.`);
  }
};

const assertTools = (tools: unknown) => {
  if (tools === undefined) return;
  if (!Array.isArray(tools)) throw badRequest("tools: Input should be a valid list");
  for (const [index, tool] of (tools as ToolDefinition[]).entries()) {
    assertKnownKeys({ value: tool, allowed: TOOL_KEYS, path: `tools.${index}.` });
    if (!TOOL_NAME_PATTERN.test(tool.name ?? "")) throw badRequest(`tools.${index}.name: String should match pattern '^[a-zA-Z0-9_-]{1,128}$'`);
    if (typeof tool.description !== "string") throw badRequest(`tools.${index}.description: Input should be a valid string`);
    if (tool.input_schema?.type !== "object") throw badRequest(`tools.${index}.input_schema.type: Input should be 'object'`);
  }
};

const assertValidRequest = ({ request, contextWindowTokens }: { request: MessageRequest; contextWindowTokens: number }) => {
  assertKnownKeys({ value: request, allowed: REQUEST_KEYS, path: "" });
  if (typeof request.model !== "string" || !request.model) throw badRequest("model: Field required");
  if (!Number.isInteger(request.max_tokens) || request.max_tokens < 1) throw badRequest("max_tokens: Field required, and it must be a positive integer");
  if (request.system !== undefined && typeof request.system !== "string") throw badRequest("system: Input should be a valid string");
  const { temperature } = request;
  if (temperature !== undefined && !(temperature >= MIN_TEMPERATURE && temperature <= MAX_TEMPERATURE)) {
    throw badRequest(`temperature: Input should be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`);
  }
  assertTools(request.tools);
  assertMessages(request.messages);
  assertToolPairing(request.messages);
  assertEndsWithUser(request.messages);
  const inputTokens = estimateTokens({ system: request.system, tools: request.tools, messages: request.messages });
  if (inputTokens > contextWindowTokens) throw badRequest(`prompt is too long: ${inputTokens} tokens > ${contextWindowTokens} maximum`);
};

export class FakeModel {
  readonly requests: MessageRequest[] = [];
  readonly responses: MessageResponse[] = [];
  readonly messages = { create: (request: MessageRequest) => this.create(request) };
  private readonly script: TurnScript[];
  private readonly options: Required<FakeModelOptions>;
  private nextIndex = 0;

  constructor(script: TurnScript[], options: FakeModelOptions = {}) {
    this.script = script;
    this.options = {
      modelName: options.modelName ?? DEFAULT_MODEL_NAME,
      contextWindowTokens: options.contextWindowTokens ?? DEFAULT_CONTEXT_WINDOW_TOKENS,
      isLastTurnRepeated: options.isLastTurnRepeated ?? false
    };
  }

  static always(turn: TurnScript, options: FakeModelOptions = {}) {
    return new FakeModel([turn], { ...options, isLastTurnRepeated: true });
  }

  get callCount() {
    return this.requests.length;
  }

  get remainingTurns() {
    return Math.max(this.script.length - this.nextIndex, 0);
  }

  private takeTurn(request: MessageRequest) {
    const isScriptExhausted = this.nextIndex >= this.script.length;
    if (isScriptExhausted && !this.options.isLastTurnRepeated) {
      throw new Error(`FakeModel script has ${this.script.length} turn(s) but the code called the model ${this.nextIndex + 1} times. Is there a loop that never stops?`);
    }
    const scripted = this.script[Math.min(this.nextIndex, this.script.length - 1)];
    this.nextIndex++;
    return typeof scripted === "function" ? scripted(request) : scripted;
  }

  private buildResponse({ turn, request }: { turn: ReplyTurn; request: MessageRequest }): MessageResponse {
    const callNumber = this.requests.length;
    const content = turn.content.map((block, index) =>
      block.type === "tool_use" ? { ...block, id: block.id ?? `toolu_fake_${callNumber}_${index}` } : block
    );
    const hasToolUse = content.some(block => block.type === "tool_use");
    const stopReason = turn.stopReason ?? (hasToolUse ? "tool_use" : "end_turn");
    return {
      id: `msg_fake_${callNumber}`,
      type: "message",
      role: "assistant",
      model: request.model,
      content,
      stop_reason: stopReason,
      stop_sequence: stopReason === "stop_sequence" ? (turn.stopSequence ?? null) : null,
      usage: {
        input_tokens: estimateTokens({ system: request.system, tools: request.tools, messages: request.messages }),
        output_tokens: estimateTokens(content),
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        ...turn.usage
      }
    };
  }

  private async create(request: MessageRequest) {
    assertValidRequest({ request, contextWindowTokens: this.options.contextWindowTokens });
    const snapshot = structuredClone(request);
    this.requests.push(snapshot);
    const turn = this.takeTurn(snapshot);
    if (turn.kind === "fail") throw new FakeApiError({ status: turn.status, message: turn.message });
    const response = this.buildResponse({ turn, request: snapshot });
    this.responses.push(structuredClone(response));
    return response;
  }
}
