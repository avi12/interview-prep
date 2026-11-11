import { KIT_DIR_NAME } from "#scripts/lib/layout.ts";
import { RunnerDir } from "#scripts/lib/runner-bundle.ts";

export const VIRTUAL_ROOT = "/repo";

export function virtualPath(repoPath: string) {
  return `${VIRTUAL_ROOT}/${repoPath}`;
}

export function lessonDirOf(lessonId: string) {
  return virtualPath(`${RunnerDir.curriculum}/${lessonId}`);
}

export function implDirOf(lessonId: string) {
  return virtualPath(`${RunnerDir.work}/${lessonId}`);
}

export const KIT_DIR = virtualPath(`${RunnerDir.curriculum}/${KIT_DIR_NAME}`);
