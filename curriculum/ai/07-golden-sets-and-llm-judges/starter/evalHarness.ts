import { z } from "zod";
import type { MessagesClient } from "#kit/fakeModel.ts";

export type EvalCase = { id: string; input: string; reference: string };
export type Verdict = { verdict: "pass" | "fail"; reason: string };
export type EvalFailure = { caseId: string; answer: string; reason: string };
export type EvalReport = { total: number; passed: number; passRate: number; failures: EvalFailure[]; isGatePassing: boolean };
export type PairWinner = "first" | "second" | "tie";

type JudgeSetup = { judge: MessagesClient; judgeModel: string; rubric: string };

export const UNREADABLE_VERDICT_REASON = "judge output was not a valid verdict";

const JUDGE_MAX_TOKENS = 400;
const DEFAULT_MIN_PASS_RATE = 1;
const VERDICT_FORMAT = 'Reply with JSON only, reason first: {"reason": "<one or two sentences>", "verdict": "pass" or "fail"}.';
const WINNER_FORMAT =
  'Reply with JSON only, reason first: {"reason": "<one or two sentences>", "winner": "A" or "B" or "tie"}. Answer A is the one shown first.';

const verdictSchema = z.object({ verdict: z.enum(["pass", "fail"]), reason: z.string() });
const winnerSchema = z.object({ winner: z.enum(["A", "B", "tie"]) });

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

const askJudge = async ({ judge, judgeModel, rubric, replyFormat, userText }: JudgeSetup & { replyFormat: string; userText: string }) => {
  const response = await judge.messages.create({
    model: judgeModel,
    max_tokens: JUDGE_MAX_TOKENS,
    system: `${rubric}\n\n${replyFormat}`,
    messages: [{ role: "user", content: userText }]
  });
  return response.content.flatMap(block => (block.type === "text" ? [block.text] : [])).join("");
};

const parseWinner = (text: string) => {
  const result = winnerSchema.safeParse(parseJson(text));
  return result.success ? result.data.winner : "tie";
};

const pairText = ({ question, a, b }: { question: string; a: string; b: string }) =>
  `Question: ${question}\n\n<answer_a>\n${a}\n</answer_a>\n\n<answer_b>\n${b}\n</answer_b>`;

export function parseVerdict(text: string): Verdict {
  return { verdict: "fail", reason: UNREADABLE_VERDICT_REASON };
}

export async function judgeCase({ testCase, answer, ...setup }: JudgeSetup & { testCase: EvalCase; answer: string }): Promise<Verdict> {
  return { verdict: "fail", reason: UNREADABLE_VERDICT_REASON };
}

export async function runEval({
  cases,
  system,
  minPassRate = DEFAULT_MIN_PASS_RATE,
  ...setup
}: JudgeSetup & { cases: EvalCase[]; system: (input: string) => Promise<string> | string; minPassRate?: number }): Promise<EvalReport> {
  return { total: 0, passed: 0, passRate: 0, failures: [], isGatePassing: false };
}

export async function judgePair({ question, first, second, ...setup }: JudgeSetup & { question: string; first: string; second: string }): Promise<PairWinner> {
  return "tie";
}
