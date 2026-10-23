import { WORK_DIR } from "#scripts/lib/paths.ts";
import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

function lessonIdOf(testUrl: string) {
  const lessonDir = dirname(dirname(fileURLToPath(testUrl)));
  return `${basename(dirname(lessonDir))}/${basename(lessonDir)}`;
}

export function implPath({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  const dir = process.env.IMPL_DIR ?? resolve(WORK_DIR, lessonIdOf(testUrl));
  return resolve(dir, file);
}

export async function loadImpl<T = Record<string, unknown>>({ testUrl, file }: {
  testUrl: string;
  file: string;
}) {
  const path = implPath({
    testUrl,
    file
  });
  if (!existsSync(path)) {
    throw new Error(`Missing ${file}. Run: pnpm lesson open ${lessonIdOf(testUrl)}`);
  }

  const loaded: T = await import(pathToFileURL(path).href);
  return loaded;
}
