export const COURSE_PATH = "/course";
export const FIREBASE_INIT_PATH = "/__/firebase/init.json";
export const API_PATH = "/api";
export const HASHED_ASSETS_DIR_NAME = "assets";
export const HASHED_ASSETS_PATH = `/${HASHED_ASSETS_DIR_NAME}`;
export const VERSION_FILE_NAME = "version.json";
export const VERSION_PATH = `/${VERSION_FILE_NAME}`;

export const RUNNER_PATH = "/runner";
export const WORKERS_DIR_NAME = "workers";
export const WORKERS_PATH = `/${WORKERS_DIR_NAME}`;

export function runnerUrl(path: string) {
  return `${RUNNER_PATH}/${path}`;
}
