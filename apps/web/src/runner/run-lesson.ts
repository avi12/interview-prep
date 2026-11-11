import { loadRunnerKit, loadRunnerLesson } from "@/runner/lesson-data.ts";
import { PyReply, type PyRunResponse } from "@/runner/py/protocol.ts";
import { type RunResponse, WorkerReply } from "@/runner/ts/protocol.ts";
import { ChannelEnd, type ChannelOutcome } from "@/runner/worker-channel.ts";
import { parseQueryResults } from "#scripts/lib/query-result.ts";
import { RecordKind } from "#scripts/lib/record-env.ts";
import { type BrowserRunResult, MS_PER_SECOND, type TestResult, timedOutOutput } from "#scripts/lib/run-result.ts";
import { type LessonFiles, RunnableLang, type RunnerLesson } from "#scripts/lib/runner-bundle.ts";
import { parseTestCases } from "#scripts/lib/test-cases.ts";

const PASS_MARK = "✓";
const FAIL_MARK = "✗";
const SUITE_SEPARATOR = " > ";
const MESSAGE_INDENT = "    ";
const LINE_BREAK = "\n";
const PY_EXIT_OK = 0;

function asJsonLines(records: unknown[]) {
  return records.map(record => JSON.stringify(record)).join(LINE_BREAK);
}

function failedRun(output: string) {
  return {
    isPass: false,
    isTimedOut: false,
    output,
    queryResults: [],
    testCases: [],
    tests: []
  } satisfies BrowserRunResult;
}

function timedOutRun(lesson: RunnerLesson) {
  return {
    ...failedRun(
      timedOutOutput({
        timeoutSeconds: lesson.timeoutSeconds,
        output: ""
      })
    ),
    isTimedOut: true
  } satisfies BrowserRunResult;
}

function testLine(test: TestResult) {
  const name = [...test.suite, test.name].join(SUITE_SEPARATOR);
  if (test.isPass) {
    return `${PASS_MARK} ${name}`;
  }

  return [`${FAIL_MARK} ${name}`, ...test.message.split(LINE_BREAK).map(line => `${MESSAGE_INDENT}${line}`)].join(LINE_BREAK);
}

function summaryLine(tests: TestResult[]) {
  const passed = tests.filter(test => test.isPass).length;
  return `Tests: ${tests.length - passed} failed, ${passed} passed (${tests.length})`;
}

function tsOutput({ tests, errors }: {
  tests: TestResult[];
  errors: string[];
}) {
  return [...tests.map(testLine), ...errors, summaryLine(tests)].join(LINE_BREAK);
}

function settled<Response>({ outcome, lesson, signal }: {
  outcome: ChannelOutcome<Response>;
  lesson: RunnerLesson;
  signal: AbortSignal;
}) {
  if (outcome.end === ChannelEnd.done) {
    return outcome.response;
  }

  if (outcome.end === ChannelEnd.crashed) {
    return failedRun(outcome.message);
  }

  if (signal.aborted) {
    throw signal.reason;
  }

  return timedOutRun(lesson);
}

function fromTsResponse(response: RunResponse) {
  if (response.kind === WorkerReply.crash) {
    return failedRun(response.message);
  }

  const { tests, errors, records } = response;
  return {
    isPass: errors.length === 0 && tests.length > 0 && tests.every(test => test.isPass),
    isTimedOut: false,
    output: tsOutput({
      tests,
      errors
    }),
    queryResults: parseQueryResults(asJsonLines(records[RecordKind.queryResults])),
    testCases: parseTestCases(asJsonLines(records[RecordKind.testCases])),
    tests
  } satisfies BrowserRunResult;
}

function fromPyResponse(response: PyRunResponse) {
  if (response.kind === PyReply.crash) {
    return failedRun(response.message);
  }

  return {
    isPass: response.exitCode === PY_EXIT_OK,
    isTimedOut: false,
    output: response.output,
    queryResults: [],
    testCases: parseTestCases(asJsonLines(response.testCases)),
    tests: response.tests
  } satisfies BrowserRunResult;
}

async function runPython({ lesson, files, signal }: {
  lesson: RunnerLesson;
  files: LessonFiles;
  signal: AbortSignal;
}) {
  const kitLoading = loadRunnerKit();
  const { runPyLesson } = await import("@/runner/py/client.ts");
  const kit = await kitLoading;
  const outcome = await runPyLesson({
    message: {
      lesson,
      kitFiles: kit.pyFiles,
      files
    },
    signal,
    timeoutMs: lesson.timeoutSeconds * MS_PER_SECOND
  });
  const response = settled({
    outcome,
    lesson,
    signal
  });
  return "kind" in response ? fromPyResponse(response) : response;
}

async function runTypeScript({ lesson, files, signal }: {
  lesson: RunnerLesson;
  files: LessonFiles;
  signal: AbortSignal;
}) {
  const kitLoading = loadRunnerKit();
  const { runTsLesson } = await import("@/runner/ts/client.ts");
  const kit = await kitLoading;
  const outcome = await runTsLesson({
    lesson,
    kit,
    files,
    signal,
    timeoutMs: lesson.timeoutSeconds * MS_PER_SECOND
  });
  const response = settled({
    outcome,
    lesson,
    signal
  });
  return "kind" in response ? fromTsResponse(response) : response;
}

export async function runLesson({ lesson, files, signal = new AbortController().signal }: {
  lesson: { id: string };
  files: LessonFiles;
  signal?: AbortSignal;
}) {
  const runnerLesson = await loadRunnerLesson(lesson.id);
  const input = {
    lesson: runnerLesson,
    files,
    signal
  };
  return runnerLesson.lang === RunnableLang.py ? runPython(input) : runTypeScript(input);
}
