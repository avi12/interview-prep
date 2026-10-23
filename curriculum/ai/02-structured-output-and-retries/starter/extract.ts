import { type MessageResponse, type MessagesClient, textOf } from "#kit/fakeModel.ts";
import { z } from "zod";

export class ExtractionError extends Error {
  readonly attempts: number;
  readonly lastProblem: string;

  constructor({ attempts, lastProblem }: {
    attempts: number;
    lastProblem: string;
  }) {
    super(`Gave up after ${attempts} attempts. Last problem: ${lastProblem}`);
    this.name = "ExtractionError";
    this.attempts = attempts;
    this.lastProblem = lastProblem;
  }
}

export type CheckResult<Data> = {
  isValid: true;
  data: Data;
} | {
  isValid: false;
  problem: string;
};

export const MODEL = "claude-sonnet-5-5";
export const MAX_TOKENS = 1024;
const FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

export function replyTextOf(response: MessageResponse) {
  return textOf(response.content);
}

export function jsonTextOf(replyText: string) {
  return FENCE_PATTERN.exec(replyText.trim())?.[1] ?? replyText.trim();
}

export function buildSystemPrompt(schema: z.ZodType) {
  return [
    "Extract the data from the user's text.",
    "Reply with one JSON object that matches this JSON Schema, and nothing else:",
    JSON.stringify(z.toJSONSchema(schema))
  ].join("\n");
}

export function checkReply<Schema extends z.ZodType>(_options: {
  reply: string;
  schema: Schema;
}): CheckResult<z.output<Schema>> {
  return {
    isValid: false,
    problem: "not implemented"
  };
}

export async function extractWithRetry<Schema extends z.ZodType>(_options: {
  client: MessagesClient;
  text: string;
  schema: Schema;
  maxAttempts: number;
}): Promise<{
  data: z.output<Schema>;
  attempts: number;
}> {
  throw new ExtractionError({
    attempts: 0,
    lastProblem: "not implemented"
  });
}
