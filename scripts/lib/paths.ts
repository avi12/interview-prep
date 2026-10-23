import {
  DIST_DIR_NAME,
  INDEX_RELATIVE_PATH,
  LAST_TEST_RELATIVE_PATH,
  LESSONS_DIST_RELATIVE_DIR,
  PROGRESS_RELATIVE_PATH,
  WORK_DIR_NAME
} from "#scripts/lib/layout.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CURRICULUM_DIR = resolve(ROOT, "curriculum");
export const WORK_DIR = resolve(ROOT, WORK_DIR_NAME);
export const DIST_DIR = resolve(ROOT, DIST_DIR_NAME);
export const LESSONS_DIST_DIR = resolve(ROOT, LESSONS_DIST_RELATIVE_DIR);
export const PROGRESS_FILE = resolve(ROOT, PROGRESS_RELATIVE_PATH);
export const LAST_TEST_FILE = resolve(ROOT, LAST_TEST_RELATIVE_PATH);
export const INDEX_FILE = resolve(ROOT, INDEX_RELATIVE_PATH);
export const PATH_FILE = resolve(CURRICULUM_DIR, "path.json");
export const TRACKS_FILE = resolve(CURRICULUM_DIR, "tracks.json");
export const ASSETS_DIR = resolve(ROOT, "assets");
export const KIT_DIR_NAME = "_kit";
export const SERVER_DATA_DIR = resolve(ROOT, ".vscode-server");
export const TOKEN_FILE = resolve(SERVER_DATA_DIR, "connection-token");
