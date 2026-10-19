import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ROOT } from "#scripts/lib/paths.ts";

const PORT = Number(process.env.PORT ?? 8765);
const HOST = "127.0.0.1";
const SERVER_DATA_DIR = resolve(ROOT, ".vscode-server");
const EXTENSION_DIR = resolve(ROOT, "apps", "vscode-ext");
const VSIX_PATH = resolve(EXTENSION_DIR, "interview-prep.vsix");
const READY_MARKER = "Web UI available";
const RECOMMENDED_EXTENSIONS = ["ms-python.python", "vitest.explorer"];
const WORKSPACE_SETTINGS_FILE = resolve(ROOT, ".vscode", "settings.json");
const MACHINE_SETTINGS_FILE = resolve(SERVER_DATA_DIR, "data", "Machine", "settings.json");
const SERVER_ONLY_SETTINGS = {
  "security.workspace.trust.enabled": false,
  "workbench.tips.enabled": false,
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "update.showReleaseNotes": false
};
const isOpeningBrowser = !process.argv.includes("--no-open");

const toUrlPath = (path: string) => `/${path.replaceAll("\\", "/")}`;

const runStep = ({ label, command, args, cwd = ROOT }: { label: string; command: string; args: string[]; cwd?: string }) => {
  console.log(`> ${label}`);
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell: true });
  return result.status === 0;
};

const installExtension = (target: string) =>
  runStep({
    label: `install ${target}`,
    command: "code",
    args: ["--install-extension", target, "--force", "--extensions-dir", `"${resolve(SERVER_DATA_DIR, "extensions")}"`]
  });

const writeMachineSettings = () => {
  const workspaceSettings = JSON.parse(readFileSync(WORKSPACE_SETTINGS_FILE, "utf8"));
  mkdirSync(dirname(MACHINE_SETTINGS_FILE), { recursive: true });
  writeFileSync(MACHINE_SETTINGS_FILE, JSON.stringify({ ...workspaceSettings, ...SERVER_ONLY_SETTINGS }, null, 2));
};

writeMachineSettings();

const isBuilt =
  runStep({ label: "build lessons", command: "node", args: ["scripts/build-lessons.ts"] }) &&
  runStep({ label: "package extension", command: "pnpm", args: ["package"], cwd: EXTENSION_DIR });
if (!isBuilt) process.exit(1);

installExtension(`"${VSIX_PATH}"`);
for (const extension of RECOMMENDED_EXTENSIONS) installExtension(extension);

const token = randomBytes(16).toString("hex");
const url = `http://${HOST}:${PORT}/?tkn=${token}&folder=${encodeURIComponent(toUrlPath(ROOT))}`;

const server = spawn(
  "code",
  [
    "serve-web",
    "--host", HOST,
    "--port", String(PORT),
    "--connection-token", token,
    "--accept-server-license-terms",
    "--server-data-dir", `"${SERVER_DATA_DIR}"`,
    "--default-folder", `"${ROOT}"`,
    "--disable-telemetry"
  ],
  { stdio: ["ignore", "pipe", "inherit"], shell: true }
);

const stopServer = () => {
  if (server.pid) spawnSync("taskkill", ["/PID", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  process.exit(0);
};

let isAnnounced = false;
server.stdout.on("data", chunk => {
  const text = String(chunk);
  if (!text.includes(READY_MARKER) || isAnnounced) return;
  isAnnounced = true;
  console.log(`\nInterview Prep is running:\n  ${url}\n\nCtrl+C stops it`);
  if (isOpeningBrowser) spawn("cmd", ["/c", "start", '""', url.replaceAll("&", "^&")], { stdio: "ignore", detached: true }).unref();
});

process.on("SIGINT", stopServer);
process.on("SIGTERM", stopServer);
server.on("exit", code => process.exit(code ?? 0));
