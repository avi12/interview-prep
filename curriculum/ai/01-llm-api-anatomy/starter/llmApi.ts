import type {
  Message,
  MessageRequest,
  MessageResponse,
  MessagesClient,
  Usage
} from "#kit/fakeModel.ts";

export type Prices = {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion: number;
  cacheReadPerMillion: number;
};

export type RequestInput = {
  model: string;
  system?: string;
  history?: Message[];
  userText: string;
  maxTokens: number;
  stopSequences?: string[];
};

export const TOKENS_PER_MILLION = 1_000_000;

export function buildRequest({ model, maxTokens }: RequestInput): MessageRequest {
  return {
    model,
    max_tokens: maxTokens,
    messages: []
  };
}

export function readResponse(response: MessageResponse) {
  return {
    text: "",
    stopReason: response.stop_reason,
    isTruncated: false
  };
}

export function costOf(_options: {
  usage: Usage;
  prices: Prices;
}) {
  return 0;
}

export async function ask(_options: RequestInput & {
  client: MessagesClient;
  prices: Prices;
}) {
  return {
    text: "",
    stopReason: "",
    isTruncated: false,
    costUsd: 0
  };
}
