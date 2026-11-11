import type { LessonEntry, TestsFinished } from "@/courseHost.ts";
import { resetFakeFiles } from "@/test/vscodeFake.ts";
import { createWebCourseHost, type LessonFile, type RunLesson } from "@/webHost.ts";
import type { Progress } from "@scripts/lib/progress-sync.ts";
import type { RunResult } from "@scripts/lib/run-result.ts";
import { Lang } from "@scripts/lib/schema.ts";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import * as vscode from "vscode";

const ROOT = vscode.Uri.file("/workspace");
const COURSE_BASE_URL = "https://course.example/files/";
const LESSON: LessonEntry = {
  id: "foundations/01-two-sum",
  track: "foundations",
  title: "Two Sum",
  minutes: 15,
  lang: Lang.ts,
  roles: ["backend"],
  files: ["twoSum.ts"],
  hasExercise: true,
  html: "dist/lessons/foundations/01-two-sum.html",
  tutor: "dist/lessons/foundations/01-two-sum.tutor.json",
  sqlTables: []
};
const STARTER: LessonFile[] = [
  {
    path: "twoSum.ts",
    content: "export function twoSum() {}"
  },
  {
    path: "helpers/math.ts",
    content: "export const ZERO = 0;"
  }
];
const PASSING_RUN: RunResult = {
  isPass: true,
  isTimedOut: false,
  output: "1 passed",
  queryResults: [],
  testCases: [{
    test: "finds the pair",
    isPass: true,
    input: "[2, 7], 9",
    expected: "[0, 1]",
    actual: "[0, 1]"
  }]
};

function workUri(file: string) {
  return vscode.Uri.joinPath(ROOT, "work", LESSON.id, file);
}

async function readText(file: string) {
  return new TextDecoder().decode(await vscode.workspace.fs.readFile(workUri(file)));
}

function createHost(runLesson: RunLesson = async () => PASSING_RUN) {
  const passed: string[] = [];
  const listeners = new Set<() => void>();
  let progress: Progress = {};
  const host = createWebCourseHost({
    courseBaseUrl: COURSE_BASE_URL,
    workspaceRoot: ROOT,
    readStarter: async () => STARTER,
    runLesson,
    progress: {
      current: () => progress,
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      async markPassed(lessonId) {
        passed.push(lessonId);
      }
    }
  });
  function setProgress(next: Progress) {
    progress = next;
    for (const listener of listeners) {
      listener();
    }
  }
  return {
    host,
    passed,
    setProgress
  };
}

function nextFinish(host: ReturnType<typeof createHost>["host"]) {
  return new Promise<TestsFinished>(resolve => {
    host.onDidFinishTests(resolve);
  });
}

beforeEach(() => resetFakeFiles());
afterEach(() => vi.unstubAllGlobals());

describe("createWebCourseHost", () => {
  it("fetches course files relative to the course base URL", async () => {
    const fetchCourseFile = vi.fn(async (url: URL) => new Response(`page at ${url.pathname}`));
    vi.stubGlobal("fetch", fetchCourseFile);
    const { host } = createHost();

    expect(await host.readCourseFile(LESSON.html)).toBe("page at /files/dist/lessons/foundations/01-two-sum.html");
  });

  it("reads a missing or unreachable course file as null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    const { host } = createHost();
    expect(await host.readCourseFile("dist/index.json")).toBeNull();

    vi.stubGlobal(
      "fetch", vi.fn(async () => {
        throw new TypeError("offline");
      })
    );
    expect(await host.readCourseFile("dist/index.json")).toBeNull();
  });

  it("copies the starter once and keeps the learner's edits", async () => {
    const { host } = createHost();
    await host.ensureExerciseFiles(LESSON);
    expect(await readText("helpers/math.ts")).toBe("export const ZERO = 0;");

    await vscode.workspace.fs.writeFile(workUri("twoSum.ts"), new TextEncoder().encode("edited"));
    await host.ensureExerciseFiles(LESSON);
    expect(await readText("twoSum.ts")).toBe("edited");
  });

  it("resets the exercise to the starter", async () => {
    const { host } = createHost();
    await host.ensureExerciseFiles(LESSON);
    await vscode.workspace.fs.writeFile(workUri("twoSum.ts"), new TextEncoder().encode("edited"));
    await vscode.workspace.fs.writeFile(workUri("scratch.ts"), new TextEncoder().encode("extra"));

    await host.resetExercise(LESSON);

    expect(await readText("twoSum.ts")).toBe("export function twoSum() {}");
    await expect(readText("scratch.ts")).rejects.toThrow();
  });

  it("runs the tests on the learner's files, records the pass and reports the result", async () => {
    const runLesson = vi.fn<RunLesson>(async () => PASSING_RUN);
    const { host, passed } = createHost(runLesson);
    const finished = nextFinish(host);

    await host.runTests(LESSON);

    expect(await finished).toEqual({
      id: LESSON.id,
      isPass: true
    });
    expect(runLesson).toHaveBeenCalledWith({
      lesson: LESSON,
      files: expect.arrayContaining(STARTER)
    });
    expect(passed).toEqual([LESSON.id]);
    expect(await host.readTestReport(LESSON.id)).toEqual({
      output: PASSING_RUN.output,
      queryResults: PASSING_RUN.queryResults,
      testCases: PASSING_RUN.testCases
    });
  });

  it("reports a runner failure as a failed run", async () => {
    const { host, passed } = createHost(async () => {
      throw new Error("The runner crashed");
    });
    const finished = nextFinish(host);

    await host.runTests(LESSON);

    expect((await finished).isPass).toBe(false);
    expect(passed).toEqual([]);
    expect((await host.readTestReport(LESSON.id)).output).toBe("The runner crashed");
  });

  it("reads an empty report before the first run", async () => {
    const { host } = createHost();
    expect(await host.readTestReport(LESSON.id)).toEqual({
      output: "",
      queryResults: [],
      testCases: []
    });
  });

  it("marks a reading lesson done through the progress store", async () => {
    const { host, passed } = createHost();
    await host.markDone(LESSON);
    expect(passed).toEqual([LESSON.id]);
  });

  it("serves progress from the store and announces its changes until disposed", async () => {
    const { host, setProgress } = createHost();
    const onChange = vi.fn();
    const subscription = host.onDidChangeProgress(onChange);
    const progress = {
      [LESSON.id]: {
        attempts: 1,
        passedAt: "2026-11-10T00:00:00.000Z"
      }
    };

    setProgress(progress);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(await host.readProgress()).toEqual(progress);

    subscription.dispose();
    setProgress({});
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
