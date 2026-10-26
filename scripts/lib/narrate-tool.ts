import { NARRATE_TOOL_DIR, NARRATION_HOST_DIR, ROOT } from "#scripts/lib/paths.ts";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function toNativePath(path: string) {
  return path.replaceAll("\\", "/");
}

function runVisibly({ command, args, cwd }: {
  command: string;
  args: string[];
  cwd: string;
}) {
  return spawnSync(command, args, {
    cwd,
    shell: true,
    stdio: "inherit"
  }).status === 0;
}

export function ensureNarrateTool() {
  const isCheckedOut = existsSync(resolve(NARRATE_TOOL_DIR, "package.json"));
  if (!isCheckedOut && !runVisibly({
    command: "git",
    args: ["submodule", "update", "--init", "--", toNativePath(NARRATE_TOOL_DIR)],
    cwd: ROOT
  })) {
    return false;
  }

  const isInstalled = existsSync(resolve(NARRATE_TOOL_DIR, "node_modules"));
  return isInstalled || runVisibly({
    command: "pnpm",
    args: ["install"],
    cwd: NARRATE_TOOL_DIR
  });
}

export function buildNarrationHost() {
  return ensureNarrateTool() && runVisibly({
    command: "pnpm",
    args: ["--dir", toNativePath(NARRATE_TOOL_DIR), "build:host", toNativePath(NARRATION_HOST_DIR)],
    cwd: ROOT
  });
}
