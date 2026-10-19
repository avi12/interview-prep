import { existsSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WORK_DIR } from "#scripts/lib/paths.ts";

const lessonIdOf = (testUrl: string) => {
  const lessonDir = dirname(dirname(fileURLToPath(testUrl)));
  return `${basename(dirname(lessonDir))}/${basename(lessonDir)}`;
};

export const implPath = ({ testUrl, file }: { testUrl: string; file: string }) => {
  const dir = process.env.IMPL_DIR ?? resolve(WORK_DIR, lessonIdOf(testUrl));
  return resolve(dir, file);
};

export const loadImpl = async <T = Record<string, unknown>>({ testUrl, file }: { testUrl: string; file: string }) => {
  const path = implPath({ testUrl, file });
  if (!existsSync(path)) throw new Error(`Missing ${file}. Run: pnpm lesson open ${lessonIdOf(testUrl)}`);
  return (await import(pathToFileURL(path).href)) as T;
};
