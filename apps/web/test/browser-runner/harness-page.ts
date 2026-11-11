import {
  HARNESS_DATA_FILE,
  HARNESS_STATE_KEY,
  type HarnessData,
  harnessDataSchema,
  type HarnessLesson,
  type HarnessRow,
  type HarnessState,
  LANES_PARAM,
  ONLY_PARAM,
  Variant
} from "./harness-protocol.ts";
import { runLesson } from "@/runner/run-lesson.ts";
import type { BrowserRunResult } from "#scripts/lib/run-result.ts";
import { RunnableLang } from "#scripts/lib/runner-bundle.ts";

const DEFAULT_LANES = 3;
const MAX_PROBLEM_LENGTH = 400;
const ABORT_PROBE_MS = 4000;
const ABORT_PROBE_SLACK_MS = 3000;
const PROBLEM_SEPARATOR = " | ";

const state: HarnessState = {
  isDone: false,
  rows: [],
  fatal: ""
};
Object.assign(window, { [HARNESS_STATE_KEY]: state });

const params = new URLSearchParams(location.search);
const only = params.get(ONLY_PARAM) ?? "";
const lanes = Number(params.get(LANES_PARAM) ?? DEFAULT_LANES);
const elStatus = document.querySelector("output");

function problemOf(result: BrowserRunResult) {
  const failing = result.tests.filter(test => !test.isPass).map(test => `${test.name}: ${test.message}`);
  const text = failing.length > 0 ? failing.join(PROBLEM_SEPARATOR) : result.output;
  return text.slice(0, MAX_PROBLEM_LENGTH);
}

function record(row: HarnessRow) {
  state.rows.push(row);

  if (elStatus) {
    elStatus.textContent = `${state.rows.length} runs`;
  }
}

async function runVariant({ lesson, variant }: {
  lesson: HarnessLesson;
  variant: typeof Variant.solution | typeof Variant.starter;
}) {
  const files = variant === Variant.starter ? lesson.starter : {
    ...lesson.starter,
    ...lesson.solution
  };
  const startedAt = performance.now();
  const result = await runLesson({
    lesson,
    files
  });
  record({
    id: lesson.id,
    lang: lesson.lang,
    variant,
    isPass: result.isPass,
    isExpected: result.isPass === (variant === Variant.solution),
    isTimedOut: result.isTimedOut,
    passed: result.tests.filter(test => test.isPass).length,
    total: result.tests.length,
    testCases: result.testCases.length,
    queryResults: result.queryResults.length,
    ms: Math.round(performance.now() - startedAt),
    problem: problemOf(result)
  });
}

async function probeAbort({ data, lang }: {
  data: HarnessData;
  lang: keyof HarnessData["hangingFiles"];
}) {
  const hanging = data.hangingFiles[lang];
  if (!hanging) {
    return;
  }

  const startedAt = performance.now();
  const isRejected = await runLesson({
    lesson: {
      id: hanging.lessonId
    },
    files: hanging.files,
    signal: AbortSignal.timeout(ABORT_PROBE_MS)
  }).then(() => false, () => true);
  const elapsedMs = Math.round(performance.now() - startedAt);
  record({
    id: hanging.lessonId,
    lang,
    variant: Variant.abortProbe,
    isPass: false,
    isExpected: isRejected && elapsedMs < ABORT_PROBE_MS + ABORT_PROBE_SLACK_MS,
    isTimedOut: false,
    passed: 0,
    total: 0,
    testCases: 0,
    queryResults: 0,
    ms: elapsedMs,
    problem: isRejected ? "stopped by the caller's signal" : "the hanging run was not stopped"
  });
}

async function main() {
  const parsed = harnessDataSchema.safeParse(await (await fetch(HARNESS_DATA_FILE)).json());
  if (!parsed.success) {
    throw new Error(`Bad harness data: ${parsed.error.message}`);
  }

  const data = parsed.data;
  const lessons = data.lessons.filter(lesson => lesson.id.startsWith(only));
  let next = 0;
  async function lane() {
    while (next < lessons.length) {
      const lesson = lessons[next++];
      await runVariant({
        lesson,
        variant: Variant.solution
      });
      await runVariant({
        lesson,
        variant: Variant.starter
      });
    }
  }

  await Promise.all(Array.from({ length: lanes }, lane));

  if (only === "") {
    await probeAbort({
      data,
      lang: RunnableLang.ts
    });
    await probeAbort({
      data,
      lang: RunnableLang.py
    });
  }
}

main().catch((error: unknown) => {
  state.fatal = error instanceof Error ? `${error.message}\n${error.stack ?? ""}` : String(error);
}).finally(() => {
  state.isDone = true;
});
