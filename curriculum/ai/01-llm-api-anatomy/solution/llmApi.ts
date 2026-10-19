import type { Message, MessageRequest, MessageResponse, MessagesClient, Usage } from "#kit/fakeModel.ts";

export type Prices = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion: number;
  cacheReadPerMillion: number;
};

type RequestInput = {
  model: string;
  system?: string;
  history?: Message[];
  userText: string;
  maxTokens: number;
  stopSequences?: string[];
};

const TOKENS_PER_MILLION = 1_000_000;

export function buildRequest({ model, system, history = [], userText, maxTokens, stopSequences = [] }: RequestInput): MessageRequest {
  const messages: Message[] = [...history, { role: "user", content: userText }];
  return {
    model,
    max_tokens: maxTokens,
    messages,
    ...(system ? { system } : {}),
    ...(stopSequences.length > 0 ? { stop_sequences: stopSequences } : {})
  };
}

export function readResponse(response: MessageResponse) {
  const text = response.content.flatMap(block => (block.type === "text" ? [block.text] : [])).join("");
  return { text, stopReason: response.stop_reason, isTruncated: response.stop_reason === "max_tokens" };
}

const tokenCost = ({ tokens, pricePerMillion }: { tokens: number | null | undefined; pricePerMillion: number }) =>
  ((tokens ?? 0) * pricePerMillion) / TOKENS_PER_MILLION;

export function costOf({ usage, prices }: { usage: Usage; prices: Prices }) {
  return (
    tokenCost({ tokens: usage.input_tokens, pricePerMillion: prices.inputPerMillion }) +
    tokenCost({ tokens: usage.output_tokens, pricePerMillion: prices.outputPerMillion }) +
    tokenCost({ tokens: usage.cache_creation_input_tokens, pricePerMillion: prices.cacheWritePerMillion }) +
    tokenCost({ tokens: usage.cache_read_input_tokens, pricePerMillion: prices.cacheReadPerMillion })
  );
}

export async function ask({ client, prices, ...requestInput }: RequestInput & { client: MessagesClient; prices: Prices }) {
  const response = await client.messages.create(buildRequest(requestInput));
  return { ...readResponse(response), costUsd: costOf({ usage: response.usage, prices }) };
}
