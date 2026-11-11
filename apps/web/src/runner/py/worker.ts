import { z } from "@/lib/zod.ts";
import { engineUrl } from "@/runner/engine-url.ts";
import BROWSER_COMPAT_SOURCE from "@/runner/py/browser_compat.py?raw";
import {
  PyReply,
  type PyRunRequest,
  pyRunRequestSchema,
  type PyRunResponse,
  pytestOutcomeSchema
} from "@/runner/py/protocol.ts";
import RUN_PYTEST_SOURCE from "@/runner/py/run_pytest.py?raw";
import { implDirOf, KIT_DIR, lessonDirOf, VIRTUAL_ROOT } from "@/runner/virtual-root.ts";
import { errorText, workerScope } from "@/runner/worker-channel.ts";
import { IMPL_DIR_ENV, RECORD_ENV } from "#scripts/lib/record-env.ts";
import { EnginePath, PYODIDE_BASE_PACKAGES, PYODIDE_MODULE_FILE, RunnerDir } from "#scripts/lib/runner-bundle.ts";
import type { loadPyodide as LoadPyodide, PyodideAPI } from "pyodide";

const RUNNER_DIR = "/runner";
const RUNNER_SOURCES = {
  "run_pytest.py": RUN_PYTEST_SOURCE,
  "browser_compat.py": BROWSER_COMPAT_SOURCE
};
const RUNNER_MODULE = "run_pytest";
const RECORDS_FILE = "/tmp/test-cases.jsonl";
const PY_EXTENSION = ".py";
const LINE_BREAK = "\n";
const NO_BYTECODE_ENV = "PYTHONDONTWRITEBYTECODE";

const pyodideModuleSchema = z.object({ loadPyodide: z.custom<typeof LoadPyodide>(value => typeof value === "function") });

type Runtime = {
  pyodide: PyodideAPI;
  run: (requestJson: string) => string;
};

function silent() {
  return undefined;
}

async function startRuntime() {
  const pyodideDir = `${EnginePath.pyodideDir}/`;
  const parsed = pyodideModuleSchema.safeParse(await import(/* @vite-ignore */ engineUrl(`${pyodideDir}${PYODIDE_MODULE_FILE}`).href));
  if (!parsed.success) {
    throw new Error("The Python engine did not load");
  }

  const pyodide = await parsed.data.loadPyodide({
    indexURL: engineUrl(pyodideDir).href,
    stdout: silent,
    stderr: silent
  });
  await pyodide.loadPackage([...PYODIDE_BASE_PACKAGES], { messageCallback: silent });
  pyodide.FS.mkdirTree(RUNNER_DIR);
  for (const [name, source] of Object.entries(RUNNER_SOURCES)) {
    pyodide.FS.writeFile(`${RUNNER_DIR}/${name}`, source);
  }
  pyodide.runPython(`import sys; sys.path.insert(0, "${RUNNER_DIR}"); sys.dont_write_bytecode = True`);
  const runnerModule: { run: Runtime["run"] } = pyodide.pyimport(RUNNER_MODULE);
  return {
    pyodide,
    run: runnerModule.run
  } satisfies Runtime;
}

let runtime: Promise<Runtime> | undefined;

function pythonSources(files: Record<string, string>) {
  return Object.entries(files).filter(([path]) => path.endsWith(PY_EXTENSION)).map(([, source]) => source);
}

function importedKitSources({ kitFiles, sources }: {
  kitFiles: Record<string, string>;
  sources: string[];
}) {
  const code = sources.join(LINE_BREAK);
  function isImported(name: string) {
    const moduleName = name.slice(0, -PY_EXTENSION.length);
    return name.endsWith(PY_EXTENSION) && new RegExp(`\\b${moduleName}\\b`).test(code);
  }

  return Object.entries(kitFiles).filter(([name]) => isImported(name)).map(([, source]) => source);
}

async function run({ lesson, kitFiles, files }: PyRunRequest) {
  runtime ??= startRuntime();
  const { pyodide, run: runPytest } = await runtime;
  const sources = [...pythonSources(lesson.files), ...pythonSources(files)];
  const kitSources = importedKitSources({
    kitFiles,
    sources
  });
  await pyodide.loadPackagesFromImports([...sources, ...kitSources].join(LINE_BREAK), { messageCallback: silent });
  const lessonDir = lessonDirOf(lesson.id);
  const implDir = implDirOf(lesson.id);
  const outcome = pytestOutcomeSchema.safeParse(
    JSON.parse(
      runPytest(
        JSON.stringify({
          rootDir: VIRTUAL_ROOT,
          kitDir: KIT_DIR,
          lessonDir,
          implDir,
          testsDir: `${lessonDir}/${RunnerDir.tests}`,
          kitFiles,
          lessonFiles: lesson.files,
          implFiles: files,
          recordsFile: RECORDS_FILE,
          env: {
            [IMPL_DIR_ENV]: implDir,
            [RECORD_ENV.testCases]: RECORDS_FILE,
            [NO_BYTECODE_ENV]: "1"
          }
        })
      )
    )
  );
  if (!outcome.success) {
    throw new Error(`pytest returned an unexpected outcome: ${outcome.error.message}`);
  }

  return {
    kind: PyReply.result,
    ...outcome.data
  } satisfies PyRunResponse;
}

function reply(response: PyRunResponse) {
  workerScope.postMessage(response);
}

workerScope.addEventListener("message", async e => {
  const parsed = pyRunRequestSchema.safeParse(e.data);
  if (!parsed.success) {
    reply({
      kind: PyReply.crash,
      message: `Bad run request: ${parsed.error.message}`
    });
    return;
  }

  try {
    reply(await run(parsed.data));
  } catch (error) {
    reply({
      kind: PyReply.crash,
      message: errorText(error)
    });
  }
});
