import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASSETS_DIR_NAME,
  CURRICULUM_DIR_NAME,
  DIST_DIR_NAME,
  INDEX_RELATIVE_PATH,
  KIT_DIR_NAME,
  LAST_TEST_RELATIVE_PATH,
  LESSONS_DIST_RELATIVE_DIR,
  PROGRESS_RELATIVE_PATH,
  RUNNER_DIST_RELATIVE_DIR,
  WORK_DIR_NAME
} from "#scripts/lib/layout.ts";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CURRICULUM_DIR = resolve(ROOT, CURRICULUM_DIR_NAME);
export const WORK_DIR = resolve(ROOT, WORK_DIR_NAME);
export const DIST_DIR = resolve(ROOT, DIST_DIR_NAME);
export const LESSONS_DIST_DIR = resolve(ROOT, LESSONS_DIST_RELATIVE_DIR);
export const PROGRESS_FILE = resolve(ROOT, PROGRESS_RELATIVE_PATH);
export const LAST_TEST_FILE = resolve(ROOT, LAST_TEST_RELATIVE_PATH);
export const INDEX_FILE = resolve(ROOT, INDEX_RELATIVE_PATH);
export const PATH_FILE = resolve(CURRICULUM_DIR, "path.json");
export const TRACKS_FILE = resolve(CURRICULUM_DIR, "tracks.json");
export const ROLES_FILE = resolve(CURRICULUM_DIR, "roles.json");
export const CATEGORIES_FILE = resolve(CURRICULUM_DIR, "categories.json");
export const ASSETS_DIR = resolve(ROOT, ASSETS_DIR_NAME);
export const KIT_DIR = resolve(CURRICULUM_DIR, KIT_DIR_NAME);
export const RUNNER_DIST_DIR = resolve(ROOT, RUNNER_DIST_RELATIVE_DIR);
export const WEB_APP_DIR = resolve(ROOT, "apps", "web");
export const SERVER_DATA_DIR = resolve(ROOT, ".vscode-server");
export const TOKEN_FILE = resolve(SERVER_DATA_DIR, "connection-token");
