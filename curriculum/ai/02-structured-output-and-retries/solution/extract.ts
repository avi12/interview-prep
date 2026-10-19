import { z } from "zod";
import type { Message, MessageResponse, MessagesClient } from "#kit/fakeModel.ts";

export class ExtractionError extends Error {
  readonly attempts: number;
  readonly lastProblem: string;

  constructor({ attempts, lastProblem }: { attempts: number; lastProblem: string }) {
    super(`Gave up after ${attempts} attempts. Last problem: ${lastProblem}`);
    this.name = "ExtractionError";
    this.attempts = attempts;
    this.lastProblem = lastProblem;
  }
}

export type CheckResult<Data> = { isValid: true; data: Data } | { isValid: false; problem: string };

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 1024;
const FENCE_PATTERN = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

export const replyTextOf = (response: MessageResponse) =>
  response.content.flatMap(block => (block.type === "text" ? [block.text] : [])).join("");

export const jsonTextOf = (replyText: string) => FENCE_PATTERN.exec(replyText.trim())?.[1] ?? replyText.trim();

export const buildSystemPrompt = (schema: z.ZodType) =>
  [
    "Extract the data from the user's text.",
    "Reply with one JSON object that matches this JSON Schema, and nothing else:",
    JSON.stringify(z.toJSONSchema(schema))
  ].join("\n");

const feedbackFor = (problem: string) =>
  `Your last reply was rejected.\n${problem}\nReply again with only the corrected JSON object.`;

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function checkReply<Schema extends z.ZodType>({ reply, schema }: { reply: string; schema: Schema }): CheckResult<z.output<Schema>> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonTextOf(reply));
  } catch (error) {
    return { isValid: false, problem: `The reply was not valid JSON: ${messageOf(error)}` };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) return { isValid: false, problem: z.prettifyError(result.error) };
  return { isValid: true, data: result.data };
}

export async function extractWithRetry<Schema extends z.ZodType>({
  client,
  text,
  schema,
  maxAttempts
}: {
  client: MessagesClient;
  text: string;
  schema: Schema;
  maxAttempts: number;
}): Promise<{ data: z.output<Schema>; attempts: number }> {
  const system = buildSystemPrompt(schema);
  const messages: Message[] = [{ role: "user", content: text }];
  let lastProblem = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await client.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system, messages });
    const reply = replyTextOf(response);
    const check = checkReply({ reply, schema });
    if (check.isValid) return { data: check.data, attempts: attempt };
    lastProblem = check.problem;
    messages.push({ role: "assistant", content: reply }, { role: "user", content: feedbackFor(check.problem) });
  }
  throw new ExtractionError({ attempts: maxAttempts, lastProblem });
}
