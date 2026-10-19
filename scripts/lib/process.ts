import { spawn, spawnSync } from "node:child_process";

const RUN_TIMEOUT_MS = 90_000;

export const killTree = (pid: number | undefined) => {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }
  process.kill(-pid, "SIGKILL");
};

export const runWithTimeout = ({
  command,
  args,
  cwd,
  env,
  isInherited = false,
  timeoutMs = RUN_TIMEOUT_MS
}: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  isInherited?: boolean;
  timeoutMs?: number;
}) =>
  new Promise<{ status: number | null; output: string; isTimedOut: boolean }>(resolveRun => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: isInherited ? "inherit" : ["ignore", "pipe", "pipe"],
      detached: process.platform !== "win32"
    });
    let output = "";
    let isTimedOut = false;
    child.stdout?.on("data", chunk => (output += chunk));
    child.stderr?.on("data", chunk => (output += chunk));
    const timer = setTimeout(() => {
      isTimedOut = true;
      killTree(child.pid);
    }, timeoutMs);
    child.on("close", status => {
      clearTimeout(timer);
      resolveRun({ status, output, isTimedOut });
    });
  });
