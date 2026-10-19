import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CURRICULUM_DIR = resolve(ROOT, "curriculum");
export const WORK_DIR = resolve(ROOT, "work");
export const DIST_DIR = resolve(ROOT, "dist");
export const LESSONS_DIST_DIR = resolve(DIST_DIR, "lessons");
export const PROGRESS_FILE = resolve(ROOT, ".progress", "progress.json");
export const PATH_FILE = resolve(CURRICULUM_DIR, "path.json");
export const TRACKS_FILE = resolve(CURRICULUM_DIR, "tracks.json");
export const ASSETS_DIR = resolve(ROOT, "assets");
export const KIT_DIR_NAME = "_kit";
