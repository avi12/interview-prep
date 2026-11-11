import { buildBundle, type BundleEntry, importBundle, startEsbuild } from "@/runner/ts/bundle.ts";
import { createHost, type Host, HOST_GLOBAL } from "@/runner/ts/host-modules.ts";
import { createRecords, installKitBridge } from "@/runner/ts/kit-bridge.ts";
import { filesUnder, loadFiles } from "@/runner/ts/node/fs.ts";
import { type RunRequest, type RunResponse, WorkerReply } from "@/runner/ts/protocol.ts";
import {
  type File,
  startTests,
  type Suite,
  type Task,
  type VitestRunner
} from "@vitest/runner";
import { IMPL_DIR_ENV } from "#scripts/lib/record-env.ts";
import type { TestResult } from "#scripts/lib/run-result.ts";

const TaskState = {
  pass: "pass",
  fail: "fail"
} as const;
const SKIPPED_MODES = new Set(["skip", "todo"]);
const ImportSource = { setup: "setup" } as const;
const MAX_CONCURRENCY = 5;
const LINE_BREAK = "\n";
const SUITE_SEPARATOR = " > ";
const DID_NOT_RUN = "did not run";
const QUIET_ERROR_NAMES = new Set(["Error", "AssertionError"]);

type Built = {
  bundleId: string;
  entry: BundleEntry;
} | {
  bundleId: string;
  error: string;
};

function errorMessages(errors: {
  message?: string;
  name?: string;
}[] | undefined) {
  return (errors ?? []).map(error => (error.name && !QUIET_ERROR_NAMES.has(error.name) ? `${error.name}: ${error.message}` : (error.message ?? ""))).join(LINE_BREAK);
}

function collectResults({ tasks, suite, tests, errors }: {
  tasks: Task[];
  suite: string[];
  tests: TestResult[];
  errors: string[];
}) {
  for (const task of tasks) {
    if (task.type === "suite") {
      if (task.result?.state === TaskState.fail && task.result.errors?.length) {
        errors.push(`${[...suite, task.name].join(SUITE_SEPARATOR)}: ${errorMessages(task.result.errors)}`);
      }

      collectResults({
        tasks: task.tasks,
        suite: [...suite, task.name],
        tests,
        errors
      });
      continue;
    }

    if (SKIPPED_MODES.has(task.mode)) {
      continue;
    }

    const isPass = task.result?.state === TaskState.pass;
    tests.push({
      name: task.name,
      suite,
      isPass,
      message: errorMessages(task.result?.errors) || (isPass ? "" : DID_NOT_RUN)
    });
  }
}

async function buildAll({ host, request }: {
  host: Host;
  request: RunRequest;
}) {
  const esbuild = await startEsbuild();
  const moduleFiles = Object.keys(filesUnder(request.implDir));
  const built = new Map<string, Built>();
  for (const [index, testFile] of request.testFiles.entries()) {
    const bundleId = `bundle${index}`;
    const result = await buildBundle({
      esbuild,
      host,
      bundleId,
      testFile,
      setupFiles: request.setupFiles,
      moduleFiles,
      importMap: request.importMap
    });
    if (!result.isOk) {
      built.set(testFile, {
        bundleId,
        error: result.error
      });
      continue;
    }

    const entry = await importBundle(result.code);
    host.scope(bundleId).setModuleLoaders(entry.moduleLoaders);
    built.set(testFile, {
      bundleId,
      entry
    });
  }
  await esbuild.stop();
  return built;
}

function createRunner({ request, built, host }: {
  request: RunRequest;
  built: Map<string, Built>;
  host: Host;
}) {
  let currentFile = "";
  function activate(filepath: string) {
    const target = built.get(filepath);
    if (target) {
      host.activate(target.bundleId);
    }
  }
  return {
    config: {
      root: "/",
      setupFiles: request.setupFiles,
      passWithNoTests: false,
      allowOnly: true,
      sequence: {
        shuffle: false,
        concurrent: false,
        seed: 0,
        hooks: "stack",
        setupFiles: "list"
      },
      maxConcurrency: MAX_CONCURRENCY,
      testTimeout: request.testTimeoutMs,
      hookTimeout: request.hookTimeoutMs,
      retry: 0
    },
    onCollectStart(file: File) {
      currentFile = file.filepath;
      activate(currentFile);
    },
    onBeforeRunSuite: (suite: Suite) => activate(suite.file.filepath),
    async importFile(filepath: string, source: string) {
      const isSetup = source === ImportSource.setup;
      const target = built.get(isSetup ? currentFile : filepath);
      if (!target) {
        throw new Error(`No bundle for ${filepath}`);
      }

      if ("error" in target) {
        throw new Error(target.error);
      }

      return isSetup ? target.entry.setupLoaders[filepath]() : target.entry.testLoader();
    }
  } satisfies VitestRunner;
}

function captureUnhandledErrors() {
  const captured: string[] = [];
  function record(reason: unknown) {
    captured.push(`Unhandled error: ${reason instanceof Error ? reason.message : String(reason)}`);
  }
  self.addEventListener("unhandledrejection", e => {
    e.preventDefault();
    record(e.reason);
  });
  self.addEventListener("error", e => {
    e.preventDefault();
    record(e.error ?? e.message);
  });
  return captured;
}

export async function runSuite(request: RunRequest) {
  const unhandledErrors = captureUnhandledErrors();
  loadFiles(request.files);
  process.env[IMPL_DIR_ENV] = request.implDir;
  const host = createHost();
  const records = createRecords();
  installKitBridge({
    host,
    request,
    records
  });
  Object.assign(globalThis, {
    [HOST_GLOBAL]: {
      scope: host.scope
    }
  });
  const built = await buildAll({
    host,
    request
  });
  const files = await startTests(
    request.testFiles, createRunner({
      request,
      built,
      host
    })
  );
  const tests: TestResult[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (file.result?.state === TaskState.fail && file.result.errors?.length) {
      errors.push(errorMessages(file.result.errors));
    }

    collectResults({
      tasks: file.tasks,
      suite: [],
      tests,
      errors
    });
  }
  return {
    kind: WorkerReply.result,
    tests,
    errors: [...errors, ...unhandledErrors],
    records
  } satisfies RunResponse;
}
