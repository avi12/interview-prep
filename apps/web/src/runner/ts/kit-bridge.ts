import { KIT_BRIDGE_KEY, type KitHost, type SuiteRuns } from "#kit/host-contract.ts";
import {
  crashOutcome,
  mapWithLimit,
  MAX_PARALLEL_RUNS,
  RUN_TIMEOUT_MS,
  suiteOutcomeOf,
  SuiteTestStatus
} from "#kit/mutation-runs.ts";
import { RecordKind, type RecordKindName } from "#scripts/lib/record-env.ts";
import { MS_PER_SECOND } from "#scripts/lib/run-result.ts";
import type { Host } from "@/runner/ts/host-modules.ts";
import { existsSync, filesUnder, readFileSync, statSync } from "@/runner/ts/node/fs.ts";
import { type RunRequest, runResponseSchema, WorkerReply } from "@/runner/ts/protocol.ts";
import { implDirOf } from "@/runner/virtual-root.ts";
import { ChannelEnd, request, workerScope } from "@/runner/worker-channel.ts";

const TIMED_OUT_CRASH = `your tests took longer than ${RUN_TIMEOUT_MS / MS_PER_SECOND} seconds`;
const TRAILING_SLASH = /\/+$/;

export function createRecords() {
  const records: Record<RecordKindName, unknown[]> = {
    [RecordKind.QUERY_RESULTS]: [],
    [RecordKind.TEST_CASES]: []
  };
  return records;
}

function sharedKitFiles(importMap: Record<string, string>) {
  const files: Record<string, string> = {};
  for (const root of new Set(Object.values(importMap))) {
    Object.assign(files, filesUnder(root.replace(TRAILING_SLASH, "")));
  }
  return files;
}

async function runSuiteWithSubject({
  runs,
  subjectSource,
  request: parent
}: {
  runs: SuiteRuns;
  subjectSource: string;
  request: RunRequest;
}) {
  const worker = new Worker(workerScope.location.href, { type: "module" });
  const nested: RunRequest = {
    ...parent,
    files: {
      ...sharedKitFiles(parent.importMap),
      ...filesUnder(runs.suiteDir),
      [`${runs.suiteDir}/${runs.subjectFile}`]: subjectSource
    },
    testFiles: [`${runs.suiteDir}/${runs.suiteFile}`],
    setupFiles: [],
    implDir: runs.suiteDir,
    isRecording: false
  };
  const outcome = await request({
    worker,
    message: nested,
    schema: runResponseSchema,
    signal: AbortSignal.timeout(RUN_TIMEOUT_MS)
  });
  worker.terminate();

  if (outcome.end === ChannelEnd.ABORTED) {
    return crashOutcome(TIMED_OUT_CRASH);
  }

  if (outcome.end === ChannelEnd.CRASHED) {
    return crashOutcome(outcome.message);
  }

  const { response } = outcome;
  if (response.kind === WorkerReply.CRASH) {
    return crashOutcome(response.message);
  }

  return suiteOutcomeOf({
    tests: response.tests.map(test => ({
      title: test.name,
      status: test.isPass ? SuiteTestStatus.PASSED : SuiteTestStatus.FAILED,
      message: test.message
    })),
    crash: response.errors.join("\n")
  });
}

export function installKitBridge({
  host,
  request: parent,
  records
}: {
  host: Host;
  request: RunRequest;
  records: Record<RecordKindName, unknown[]>;
}) {
  const bridge = {
    defaultImplDir: implDirOf,
    importModule: path => host.activeScope().importPath(path),
    isFile: path => existsSync(path) && statSync(path).isFile(),
    readText: path => String(readFileSync(path, "utf8")),
    appendRecord({ kind, record }) {
      if (parent.isRecording) {
        records[kind].push(record);
      }
    },
    runSuitesWithSubjects: runs =>
      mapWithLimit({
        items: runs.subjectSources,
        limit: MAX_PARALLEL_RUNS,
        work: subjectSource =>
          runSuiteWithSubject({
            runs,
            subjectSource,
            request: parent
          })
      })
  } satisfies KitHost;
  Object.assign(globalThis, { [KIT_BRIDGE_KEY]: bridge });
}
