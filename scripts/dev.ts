import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { ROOT } from "#scripts/lib/paths.ts";
import { killTree } from "#scripts/lib/process.ts";

const EXTENSION_DIR = resolve(ROOT, "apps", "vscode-ext");

const processes = [
  { command: "node", args: ["esbuild.mjs", "--watch"], cwd: EXTENSION_DIR },
  { command: "node", args: ["--watch-path=curriculum", "--watch-path=scripts/lib", "scripts/build-lessons.ts"], cwd: ROOT },
  { command: "node", args: ["scripts/start.ts", "--dev"], cwd: ROOT }
].map(({ command, args, cwd }) => spawn(command, args, { cwd, stdio: "inherit", shell: true }));

const stopAll = () => {
  for (const { pid } of processes) killTree(pid);
  process.exit(0);
};

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
for (const child of processes) child.on("exit", stopAll);
