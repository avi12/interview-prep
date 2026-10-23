import { escapeRegex } from "#scripts/lib/regex.ts";
import { spawn, spawnSync } from "node:child_process";

const RUN_TIMEOUT_MS = 90_000;

function isWindows() {
  return process.platform === "win32";
}

export function killTree(pid: number | undefined) {
  if (!pid) {
    return;
  }

  if (isWindows()) {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    return;
  }

  process.kill(-pid, "SIGKILL");
}

function listPidsMatching(needles: string[]) {
  const condition = needles.map(needle => `$_.CommandLine -like '*${needle}*'`).join(" -and ");
  const script = `Get-CimInstance Win32_Process | Where-Object { ${condition} -and @('powershell.exe','pwsh.exe') -notcontains $_.Name } | ForEach-Object { $_.ProcessId }`;
  const { stdout } = isWindows()
    ? spawnSync("powershell", ["-NoProfile", "-Command", script], { encoding: "utf8" })
    : spawnSync("pgrep", ["-f", needles.map(escapeRegex).join(".*")], { encoding: "utf8" });
  return stdout
    .split(/\s+/)
    .map(Number)
    .filter(pid => pid > 0 && pid !== process.pid);
}

export function killMatching(needles: string[]) {
  const pids = listPidsMatching(needles);
  for (const pid of pids) {
    killTree(pid);
  }
  return pids.length;
}

export function runWithTimeout({
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
}) {
  return new Promise<{
    status: number | null;
    output: string;
    isTimedOut: boolean;
  }>(resolveRun => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: isInherited ? "inherit" : ["ignore", "pipe", "pipe"],
      detached: !isWindows()
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
      resolveRun({
        status,
        output,
        isTimedOut
      });
    });
  });
}
