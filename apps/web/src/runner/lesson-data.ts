import { runnerUrl } from "@/lib/web-paths.ts";
import type { z } from "@/lib/zod.ts";
import { RUNNER_KIT_FILE_NAME } from "#scripts/lib/layout.ts";
import {
  RunnerDir,
  type RunnerKit,
  runnerKitSchema,
  type RunnerLesson,
  runnerLessonPath,
  runnerLessonSchema
} from "#scripts/lib/runner-bundle.ts";

const STARTER_PREFIX = `${RunnerDir.starter}/`;

let kitLoading: Promise<RunnerKit> | undefined;
const lessonsLoading = new Map<string, Promise<RunnerLesson>>();

async function fetchParsed<Schema extends z.ZodType>({ path, schema }: {
  path: string;
  schema: Schema;
}) {
  const response = await fetch(runnerUrl(path), {
    headers: {
      Accept: "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`The test data at ${path} did not load (${response.status})`);
  }

  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) {
    throw new Error(`The test data at ${path} is not in the expected shape`);
  }

  return parsed.data;
}

export function loadRunnerKit() {
  kitLoading ??= fetchParsed({
    path: RUNNER_KIT_FILE_NAME,
    schema: runnerKitSchema
  }).catch((error: unknown) => {
    kitLoading = undefined;
    throw error;
  });
  return kitLoading;
}

export function loadRunnerLesson(id: string) {
  const existing = lessonsLoading.get(id);
  if (existing) {
    return existing;
  }

  const loading = fetchParsed({
    path: runnerLessonPath(id),
    schema: runnerLessonSchema
  }).catch((error: unknown) => {
    lessonsLoading.delete(id);
    throw error;
  });
  lessonsLoading.set(id, loading);
  return loading;
}

export async function loadStarterFiles(id: string) {
  const { files } = await loadRunnerLesson(id);
  return Object.entries(files)
    .filter(([path]) => path.startsWith(STARTER_PREFIX))
    .map(([path, content]) => ({
      path: path.slice(STARTER_PREFIX.length),
      content
    }));
}
