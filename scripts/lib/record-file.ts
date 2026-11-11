import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";

export function clearRecordFile(path: string) {
  rmSync(path, { force: true });
  mkdirSync(dirname(path), { recursive: true });
}

export function readRecordText(path: string) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}
