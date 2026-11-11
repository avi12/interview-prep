import { withRecordedCalls } from "#kit/calls.ts";
import { kitHost } from "#kit/host.ts";
import { LESSON_ID_SEGMENTS } from "#scripts/lib/layout.ts";
import { IMPL_DIR_ENV } from "#scripts/lib/record-env.ts";

const PATH_SEPARATOR = "/";
const LESSON_DIR_FROM_TEST = "..";
const TRAILING_SEPARATORS = /[\\/]+$/;

function lessonDirUrl(testUrl: string) {
  return new URL(`${LESSON_DIR_FROM_TEST}${PATH_SEPARATOR}`, testUrl);
}

export function lessonIdOf(testUrl: string) {
  const segments = lessonDirUrl(testUrl).pathname.split(PATH_SEPARATOR).filter(Boolean);
  return segments.slice(-LESSON_ID_SEGMENTS).map(decodeURIComponent).join(PATH_SEPARATOR);
}

export function lessonFileUrl({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  return new URL(file, lessonDirUrl(testUrl));
}

export function implDir(testUrl: string) {
  const dir = process.env[IMPL_DIR_ENV] ?? kitHost.defaultImplDir(lessonIdOf(testUrl));
  return dir.replace(TRAILING_SEPARATORS, "");
}

export function implPath({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  return `${implDir(testUrl)}${PATH_SEPARATOR}${file}`;
}

function isModule<T extends object>(value: unknown): value is T {
  return typeof value === "object" && value !== null;
}

export async function loadImpl<T extends object = Record<string, unknown>>({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  const path = implPath({
    testUrl,
    file
  });
  if (!kitHost.isFile(path)) {
    throw new Error(`Missing ${file}. Run: pnpm lesson open ${lessonIdOf(testUrl)}`);
  }

  const loaded = await kitHost.importModule(path);
  if (!isModule<T>(loaded)) {
    throw new Error(`${file} did not load as a module`);
  }

  return withRecordedCalls(loaded);
}
