import { GCP } from "#scripts/lib/gcp.ts";
import { ROOT } from "#scripts/lib/paths.ts";
import type { z } from "#scripts/lib/zod.ts";
import { spawnSync } from "node:child_process";

const DEFAULT_ACCOUNT = "avi6106@gmail.com";
const SHELL_SAFE_ARG = /^[\w@.:/=,+%-]+$/;
const NOT_FOUND_OUTPUT = /NOT_FOUND|not found|does not exist|may not exist/i;
const OUTPUT_BUFFER_BYTES = 64 * 1024 * 1024;

export const GCLOUD_ACCOUNT = process.env.GCLOUD_ACCOUNT ?? DEFAULT_ACCOUNT;

export const RUNTIME_SERVICE_ACCOUNT = `${GCP.runtimeServiceAccountName}@${GCP.projectId}.iam.gserviceaccount.com`;
export const BUILD_SERVICE_ACCOUNT_NAME = GCP.buildServiceAccountName;
export const BUILD_SERVICE_ACCOUNT = `${BUILD_SERVICE_ACCOUNT_NAME}@${GCP.projectId}.iam.gserviceaccount.com`;
export const IMAGE_REPOSITORY = `${GCP.region}-docker.pkg.dev/${GCP.projectId}/${GCP.artifactRepository}/${GCP.runService}`;

function isWindows() {
  return process.platform === "win32";
}

function quoteShellArg(arg: string) {
  if (SHELL_SAFE_ARG.test(arg)) {
    return arg;
  }

  if (isWindows()) {
    return `"${arg.replaceAll("\"", "\\\"")}"`;
  }

  return `'${arg.replaceAll("'", "'\\''")}'`;
}

export function toCommandLine({ command, args }: {
  command: string;
  args: string[];
}) {
  return [command, ...args].map(quoteShellArg).join(" ");
}

function gcloudArgs(args: string[]) {
  return [...args, `--account=${GCLOUD_ACCOUNT}`, `--project=${GCP.projectId}`, "--quiet"];
}

export function describeGcloud(args: string[]) {
  return toCommandLine({
    command: "gcloud",
    args: gcloudArgs(args)
  });
}

export function runCommand({ command, args, cwd = ROOT, isStreamed = false }: {
  command: string;
  args: string[];
  cwd?: string;
  isStreamed?: boolean;
}) {
  const result = spawnSync(
    toCommandLine({
      command,
      args
    }), {
      cwd,
      shell: true,
      encoding: "utf8",
      stdio: isStreamed ? "inherit" : ["ignore", "pipe", "pipe"],
      maxBuffer: OUTPUT_BUFFER_BYTES
    }
  );
  return {
    isSuccess: result.status === 0,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

export function mustRunCommand({ command, args, cwd, isStreamed = true }: {
  command: string;
  args: string[];
  cwd?: string;
  isStreamed?: boolean;
}) {
  console.log(
    `  $ ${toCommandLine({
      command,
      args
    })}`
  );
  const result = runCommand({
    command,
    args,
    cwd,
    isStreamed
  });
  if (!result.isSuccess) {
    throw new Error(`${command} ${args[0] ?? ""} failed: ${result.stderr.trim() || "see the output above"}`);
  }

  return result;
}

export function runGcloud({ args, isStreamed = false }: {
  args: string[];
  isStreamed?: boolean;
}) {
  return runCommand({
    command: "gcloud",
    args: gcloudArgs(args),
    isStreamed
  });
}

export function mustRunGcloud({ args, isStreamed = true }: {
  args: string[];
  isStreamed?: boolean;
}) {
  return mustRunCommand({
    command: "gcloud",
    args: gcloudArgs(args),
    isStreamed
  });
}

export function isNotFoundOutput(output: string) {
  return NOT_FOUND_OUTPUT.test(output);
}

export function readGcloudJson<Schema extends z.ZodType>({ args, schema }: {
  args: string[];
  schema: Schema;
}) {
  const result = runGcloud({ args: [...args, "--format=json"] });
  if (!result.isSuccess) {
    if (isNotFoundOutput(result.stderr)) {
      return null;
    }

    throw new Error(`gcloud ${args.join(" ")} failed: ${result.stderr.trim()}`);
  }

  const parsed = schema.safeParse(JSON.parse(result.stdout));
  if (!parsed.success) {
    throw new Error(`gcloud ${args.join(" ")} returned an unexpected shape: ${parsed.error.message}`);
  }

  return parsed.data;
}

export function printAccessToken() {
  const result = runGcloud({ args: ["auth", "print-access-token"] });
  const token = result.stdout.trim();
  if (!result.isSuccess || !token) {
    throw new Error(`Could not get an access token for ${GCLOUD_ACCOUNT}. Run: gcloud auth login ${GCLOUD_ACCOUNT}\n${result.stderr.trim()}`);
  }

  return token;
}

export function readFlag(name: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length);
}

export function hasFlag(name: string) {
  return process.argv.includes(`--${name}`);
}
