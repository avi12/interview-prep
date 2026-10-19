import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { implPath } from "./impl.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const VITEST_ENTRY = resolve(ROOT, "node_modules", "vitest", "vitest.mjs");
const RUNS_DIR = resolve(ROOT, "work", "_mutation");
const RUN_TIMEOUT_MS = 90_000;
const SETUP_TIMEOUT_MS = 240_000;
const MAX_PARALLEL_RUNS = 4;
const MAX_FAILURE_LINES = 6;
const MAX_CRASH_CHARS = 1200;
const WORD_SEPARATOR = /\s+/;
const RUN_CONFIG_FILE = "vitest.config.mjs";
const RUN_CONFIG = `export default { test: { include: ["*.test.ts"], environment: "node" } };\n`;

export type Edit = { find: string; replace: string };
export type Mutant = { name: string; edits: Edit[] };

type Assertion = { title: string; status: string; failureMessages?: string[] };
type FileResult = { status: string; message?: string; assertionResults: Assertion[] };
type JsonReport = { testResults: FileResult[] };

export type SuiteOutcome = {
  isPass: boolean;
  passedTitles: string[];
  failures: string[];
  crash: string;
};

const withUnixLineEndings = (text: string) => text.replaceAll("\r\n", "\n");

const applyEdit = ({ source, edit, mutantName }: { source: string; edit: Edit; mutantName: string }) => {
  const parts = source.split(edit.find);
  const occurrences = parts.length - 1;
  if (occurrences !== 1) throw new Error(`Mutant "${mutantName}": the text to change must appear exactly once in the reference, found ${occurrences}: ${edit.find}`);
  return parts.join(edit.replace);
};

export const applyMutant = ({ source, mutant }: { source: string; mutant: Mutant }) => {
  let mutated = withUnixLineEndings(source);
  for (const edit of mutant.edits) mutated = applyEdit({ source: mutated, edit, mutantName: mutant.name });
  return mutated;
};

const cleanEnvironment = () => {
  const kept = Object.entries(process.env).filter(([key]) => !key.startsWith("VITEST") && key !== "IMPL_DIR" && key !== "FORCE_COLOR");
  return { ...Object.fromEntries(kept), NO_COLOR: "1" };
};

const runVitest = ({ args }: { args: string[] }) =>
  new Promise<{ output: string }>(resolveRun => {
    const child = spawn(process.execPath, [VITEST_ENTRY, ...args], { cwd: ROOT, env: cleanEnvironment(), stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", chunk => (output += chunk));
    child.stderr.on("data", chunk => (output += chunk));
    const timer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS);
    child.on("close", () => {
      clearTimeout(timer);
      resolveRun({ output });
    });
  });

const STACK_LINE = /^\s+at /;

const messageWithoutStack = ({ text, count }: { text: string; count: number }) => {
  const lines = text.split("\n");
  const stackStart = lines.findIndex(line => STACK_LINE.test(line));
  return lines.slice(0, stackStart === -1 ? lines.length : stackStart).slice(0, count).join(" | ");
};

const readReport = (file: string) => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as JsonReport) : undefined);

const outcomeFrom = ({ report, output }: { report: JsonReport | undefined; output: string }): SuiteOutcome => {
  if (!report) return { isPass: false, passedTitles: [], failures: [], crash: output.slice(-MAX_CRASH_CHARS) };
  const assertions = report.testResults.flatMap(file => file.assertionResults);
  const passedTitles = assertions.filter(({ status }) => status === "passed").map(({ title }) => title);
  const failures = assertions
    .filter(({ status }) => status === "failed")
    .map(({ title, failureMessages = [] }) => `"${title}" failed: ${messageWithoutStack({ text: failureMessages[0] ?? "", count: MAX_FAILURE_LINES })}`);
  const crash = report.testResults
    .filter(file => file.status === "failed" && file.assertionResults.length === 0)
    .map(file => file.message ?? "")
    .join("\n")
    .slice(0, MAX_CRASH_CHARS);
  return { isPass: failures.length === 0 && crash === "" && passedTitles.length > 0, passedTitles, failures, crash };
};

const CLEANUP_RETRIES = 10;
const CLEANUP_RETRY_DELAY_MS = 200;
const STALE_RUN_MS = 600_000;

const removeQuietly = async (path: string) => {
  try {
    await rm(path, { recursive: true, force: true, maxRetries: CLEANUP_RETRIES, retryDelay: CLEANUP_RETRY_DELAY_MS });
  } catch {
    return;
  }
};

const removeStaleRuns = async () => {
  if (!existsSync(RUNS_DIR)) return;
  const now = Date.now();
  for (const name of readdirSync(RUNS_DIR)) {
    const path = resolve(RUNS_DIR, name);
    if (now - statSync(path).mtimeMs > STALE_RUN_MS) await removeQuietly(path);
  }
};

export const runSuiteWithSubject = async ({ suiteDir, suiteFile, subjectFile, subjectSource }: { suiteDir: string; suiteFile: string; subjectFile: string; subjectSource: string }) => {
  mkdirSync(RUNS_DIR, { recursive: true });
  const runDir = mkdtempSync(resolve(RUNS_DIR, "run-"));
  const reportFile = `${runDir}.json`;
  try {
    cpSync(suiteDir, runDir, { recursive: true, filter: source => basename(source) !== "node_modules" });
    writeFileSync(resolve(runDir, subjectFile), subjectSource);
    writeFileSync(resolve(runDir, RUN_CONFIG_FILE), RUN_CONFIG);
    const args = ["run", "--root", runDir, "--pool=threads", "--reporter=json", `--outputFile=${reportFile}`, suiteFile];
    const { output } = await runVitest({ args });
    return outcomeFrom({ report: readReport(reportFile), output });
  } finally {
    await removeQuietly(runDir);
    await removeQuietly(reportFile);
  }
};

const mapWithLimit = async <T, R>({ items, limit, work }: { items: T[]; limit: number; work: (item: T) => Promise<R> }) => {
  const results: R[] = new Array(items.length);
  let next = 0;
  const lane = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
  return results;
};

const describeProblems = (outcome: SuiteOutcome) => [...outcome.failures, outcome.crash].filter(Boolean).join("\n");

export const defineMutationCheck = ({
  testUrl,
  suiteFile,
  subjectFile,
  mutants,
  minTests,
  minTitleWords = 1
}: {
  testUrl: string;
  suiteFile: string;
  subjectFile: string;
  mutants: Mutant[];
  minTests: number;
  minTitleWords?: number;
}) => {
  const lessonDir = resolve(dirname(fileURLToPath(testUrl)), "..");
  const referenceSource = withUnixLineEndings(readFileSync(resolve(lessonDir, "starter", subjectFile), "utf8"));
  const suitePath = implPath({ testUrl, file: suiteFile });
  const subjects = [referenceSource, ...mutants.map(mutant => applyMutant({ source: referenceSource, mutant }))];
  let outcomes: SuiteOutcome[] = [];

  describe(`your tests in ${suiteFile}`, () => {
    beforeAll(async () => {
      if (!existsSync(suitePath)) throw new Error(`Missing ${suiteFile}. Run: pnpm lesson open ${basename(dirname(lessonDir))}/${basename(lessonDir)}`);
      const suiteDir = dirname(suitePath);
      await removeStaleRuns();
      outcomes = await mapWithLimit({
        items: subjects,
        limit: MAX_PARALLEL_RUNS,
        work: subjectSource => runSuiteWithSubject({ suiteDir, suiteFile, subjectFile, subjectSource })
      });
    }, SETUP_TIMEOUT_MS);

    it("pass on the correct code", () => {
      if (!outcomes[0].isPass) expect.fail(`your tests fail on the correct code:\n${describeProblems(outcomes[0]) || "no passing test was found"}`);
    });

    it(`include at least ${minTests} separate tests`, () => {
      expect(outcomes[0].passedTitles.length).toBeGreaterThanOrEqual(minTests);
    });

    it(`give every test a name of at least ${minTitleWords} words, all different`, () => {
      const titles = outcomes[0].passedTitles;
      const shortTitles = titles.filter(title => title.trim().split(WORD_SEPARATOR).length < minTitleWords);
      expect(shortTitles, "these names are too short to explain a failure").toEqual([]);
      expect(new Set(titles).size, "two tests share a name").toBe(titles.length);
    });

    it.each(mutants.map((mutant, index) => ({ number: index + 1, outcomeIndex: index + 1, name: mutant.name })))(
      `catch seeded bug $number of ${mutants.length}`,
      ({ outcomeIndex, name }) => {
        if (!outcomes[0].isPass) expect.fail("fix the tests that fail on the correct code first");
        if (outcomes[outcomeIndex].isPass) expect.fail(`your tests still pass when the code has this bug: ${name}`);
      }
    );
  });
};
