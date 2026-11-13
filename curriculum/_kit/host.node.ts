import { spawn } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync
} from "node:fs";
import { rm } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { KitHost, SuiteRuns } from "#kit/host-contract.ts";
import {
  crashOutcome,
  mapWithLimit,
  MAX_PARALLEL_RUNS,
  RUN_TIMEOUT_MS,
  suiteOutcomeOf,
  type SuiteTest,
  SuiteTestStatus
} from "#kit/mutation-runs.ts";
import { ROOT, WORK_DIR } from "#scripts/lib/paths.ts";
import { IMPL_DIR_ENV, RECORD_ENV } from "#scripts/lib/record-env.ts";
import { zod } from "#scripts/lib/zod.ts";

const VITEST_ENTRY = resolve(ROOT, "node_modules", "vitest", "vitest.mjs");
const RUNS_DIR = resolve(WORK_DIR, "_mutation");
const RUN_CONFIG_FILE = "vitest.config.mjs";
const RUN_CONFIG = `export default { test: { include: ["*.test.ts"], environment: "node" } };\n`;
const CLEANUP_RETRIES = 10;
const CLEANUP_RETRY_DELAY_MS = 200;
const STALE_RUN_MS = 600_000;
const VITEST_ENV_PREFIX = "VITEST";
const FORCE_COLOR_ENV = "FORCE_COLOR";
const DROPPED_ENV = new Set<string>([IMPL_DIR_ENV, ...Object.values(RECORD_ENV), FORCE_COLOR_ENV]);

const assertionSchema = zod.object({
  title: zod.string(),
  status: zod.string(),
  failureMessages: zod.array(zod.string()).optional()
});
const fileResultSchema = zod.object({
  status: zod.string(),
  message: zod.string().optional(),
  assertionResults: zod.array(assertionSchema)
});
const jsonReportSchema = zod.object({ testResults: zod.array(fileResultSchema) });
type JsonReport = zod.infer<typeof jsonReportSchema>;

function isKeptEnv(key: string) {
  return !key.startsWith(VITEST_ENV_PREFIX) && !DROPPED_ENV.has(key);
}

function cleanEnvironment() {
  const kept = Object.entries(process.env).filter(([key]) => isKeptEnv(key));
  return {
    ...Object.fromEntries(kept),
    NO_COLOR: "1"
  };
}

function runVitest(args: string[]) {
  return new Promise<{ output: string }>(resolveRun => {
    const child = spawn(process.execPath, [VITEST_ENTRY, ...args], {
      cwd: ROOT,
      env: cleanEnvironment(),
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", chunk => (output += chunk));
    child.stderr.on("data", chunk => (output += chunk));
    const timer = setTimeout(() => child.kill(), RUN_TIMEOUT_MS);
    child.on("close", () => {
      clearTimeout(timer);
      resolveRun({ output });
    });
  });
}

function readReport(file: string) {
  if (!existsSync(file)) {
    return undefined;
  }

  const parsed = jsonReportSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  return parsed.success ? parsed.data : undefined;
}

function statusOf(status: string) {
  if (status === SuiteTestStatus.PASSED || status === SuiteTestStatus.FAILED) {
    return status;
  }

  return SuiteTestStatus.SKIPPED;
}

function outcomeFrom({ report, output }: { report: JsonReport | undefined; output: string }) {
  if (!report) {
    return crashOutcome(output);
  }

  const assertions = report.testResults.flatMap(file => file.assertionResults);
  const tests: SuiteTest[] = assertions.map(({ title, status, failureMessages = [] }) => ({
    title,
    status: statusOf(status),
    message: failureMessages[0] ?? ""
  }));
  const crash = report.testResults
    .filter(file => file.status === SuiteTestStatus.FAILED && file.assertionResults.length === 0)
    .map(file => file.message ?? "")
    .join("\n");
  return suiteOutcomeOf({
    tests,
    crash
  });
}

async function removeQuietly(path: string) {
  try {
    await rm(path, {
      recursive: true,
      force: true,
      maxRetries: CLEANUP_RETRIES,
      retryDelay: CLEANUP_RETRY_DELAY_MS
    });
  } catch {
    return;
  }
}

async function removeStaleRuns() {
  if (!existsSync(RUNS_DIR)) {
    return;
  }

  const now = Date.now();
  for (const name of readdirSync(RUNS_DIR)) {
    const path = resolve(RUNS_DIR, name);
    if (now - statSync(path).mtimeMs > STALE_RUN_MS) {
      await removeQuietly(path);
    }
  }
}

async function runSuiteWithSubject({
  suiteDir,
  suiteFile,
  subjectFile,
  subjectSource
}: Omit<SuiteRuns, "subjectSources"> & { subjectSource: string }) {
  mkdirSync(RUNS_DIR, { recursive: true });
  const runDir = mkdtempSync(resolve(RUNS_DIR, "run-"));
  const reportFile = `${runDir}.json`;
  try {
    cpSync(suiteDir, runDir, {
      recursive: true,
      filter: source => basename(source) !== "node_modules"
    });
    writeFileSync(resolve(runDir, subjectFile), subjectSource);
    writeFileSync(resolve(runDir, RUN_CONFIG_FILE), RUN_CONFIG);
    const { output } = await runVitest([
      "run",
      "--root",
      runDir,
      "--pool=threads",
      "--reporter=json",
      `--outputFile=${reportFile}`,
      suiteFile
    ]);
    return outcomeFrom({
      report: readReport(reportFile),
      output
    });
  } finally {
    await removeQuietly(runDir);
    await removeQuietly(reportFile);
  }
}

export const kitHost = {
  defaultImplDir: lessonId => resolve(WORK_DIR, lessonId),
  async importModule(path) {
    const loaded: object = await import(pathToFileURL(path).href);
    return loaded;
  },
  isFile: path => existsSync(path),
  readText: path => readFileSync(path, "utf8"),
  appendRecord({ kind, record }) {
    const path = process.env[RECORD_ENV[kind]];
    if (path) {
      appendFileSync(path, `${JSON.stringify(record)}\n`);
    }
  },
  async runSuitesWithSubjects({ subjectSources, ...suite }) {
    await removeStaleRuns();
    return mapWithLimit({
      items: subjectSources,
      limit: MAX_PARALLEL_RUNS,
      work: subjectSource =>
        runSuiteWithSubject({
          ...suite,
          subjectSource
        })
    });
  }
} satisfies KitHost;
