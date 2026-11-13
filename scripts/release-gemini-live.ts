import { createPublicKey, generateKeyPairSync } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import { hasFlag, mustRunCommand, runCommand, toCommandLine } from "#scripts/lib/gcloud.ts";
import {
  GEMINI_LIVE_NAME,
  GeminiLiveAsset,
  geminiLiveDownloadUrl,
  geminiLiveReleaseNotes,
  geminiLiveTag
} from "#scripts/lib/gemini-live-extension.ts";
import { ROOT } from "#scripts/lib/paths.ts";
import { zod } from "#scripts/lib/zod.ts";

const isDryRun = hasFlag("dry-run");

const EXTENSION_DIR = resolve(ROOT, "apps", "gemini-live");
const OUTPUT_DIR = join(EXTENSION_DIR, ".output");
const BUILD_DIR = join(OUTPUT_DIR, "chrome-mv3");
const PACKED_CRX = `${BUILD_DIR}.crx`;
const RELEASE_DIR = join(OUTPUT_DIR, "release");
const NOTES_FILE = join(RELEASE_DIR, "notes.md");
const ZIP_EXTENSION = ".zip";
const DEFAULT_KEY_PATH = join(homedir(), ".config", "interview-prep", "Gemini Live extension.pem");
const RSA_MODULUS_BITS = 2048;
const PRIVATE_KEY_FILE_MODE = 0o600;
const CHROME_CANDIDATES = [
  process.env.CHROME_BIN,
  process.env.CHROME_FOR_TESTING,
  String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`,
  String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`,
  String.raw`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
];

const manifestSchema = zod.object({
  version: zod.string(),
  key: zod.string().optional()
});

function readManifest() {
  const parsed = manifestSchema.safeParse(JSON.parse(readFileSync(join(BUILD_DIR, "manifest.json"), "utf8")));
  if (!parsed.success) {
    throw new Error(`The built manifest is not readable: ${parsed.error.message}`);
  }

  return parsed.data;
}

function newestZip() {
  const zips = readdirSync(OUTPUT_DIR)
    .filter(name => name.endsWith(ZIP_EXTENSION))
    .map(name => join(OUTPUT_DIR, name))
    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);
  const [zip] = zips;
  if (!zip) {
    throw new Error(`wxt zip wrote no archive into ${OUTPUT_DIR}`);
  }

  return zip;
}

function ensureSigningKey() {
  const keyPath = process.env.GEMINI_LIVE_CRX_KEY ?? DEFAULT_KEY_PATH;
  if (existsSync(keyPath)) {
    return keyPath;
  }

  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: RSA_MODULUS_BITS,
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem"
    },
    publicKeyEncoding: {
      type: "spki",
      format: "pem"
    }
  });
  mkdirSync(dirname(keyPath), { recursive: true });
  writeFileSync(keyPath, privateKey, { mode: PRIVATE_KEY_FILE_MODE });
  console.log(`Generated a new signing key at ${keyPath}. Back it up: every future .crx must be signed with it.`);
  return keyPath;
}

function publicKeyOf(keyPath: string) {
  return createPublicKey(readFileSync(keyPath, "utf8"))
    .export({
      type: "spki",
      format: "der"
    })
    .toString("base64");
}

function findChrome() {
  for (const candidate of CHROME_CANDIDATES) {
    const isExistingCandidate = candidate && existsSync(candidate);
    if (isExistingCandidate) {
      return candidate;
    }
  }

  throw new Error("No Chrome found to pack the .crx: set CHROME_BIN to a Chrome or Chromium binary");
}

function packCrx(keyPath: string) {
  rmSync(PACKED_CRX, { force: true });
  const profileDir = mkdtempSync(join(tmpdir(), "gemini-live-pack-"));
  const packed = runCommand({
    command: findChrome(),
    args: [
      `--pack-extension=${BUILD_DIR}`,
      `--pack-extension-key=${keyPath}`,
      `--user-data-dir=${profileDir}`,
      "--no-message-box"
    ]
  });
  rmSync(profileDir, {
    recursive: true,
    force: true
  });
  const isPackFailed = !packed.isSuccess || !existsSync(PACKED_CRX);
  if (isPackFailed) {
    throw new Error(`Chrome wrote no .crx at ${PACKED_CRX}: ${packed.stderr.trim()}`);
  }
}

function warnOnIdMismatch({ keyPath, manifestKey }: { keyPath: string; manifestKey: string | undefined }) {
  if (publicKeyOf(keyPath) === manifestKey) {
    console.log("The .crx and the zip share one extension id.");
    return;
  }

  console.warn(
    `Warning: ${keyPath} is not the key behind the manifest's "key", so the .crx installs under a different extension id than the zip. Point GEMINI_LIVE_CRX_KEY at the original key to keep one id.`
  );
}

function publish({ version, assets }: { version: string; assets: string[] }) {
  const tag = geminiLiveTag(version);
  writeFileSync(NOTES_FILE, geminiLiveReleaseNotes());
  const isExisting = runCommand({
    command: "gh",
    args: ["release", "view", tag]
  }).isSuccess;
  const commands = isExisting
    ? [
        {
          command: "gh",
          args: ["release", "upload", tag, ...assets, "--clobber"]
        },
        {
          command: "gh",
          args: ["release", "edit", tag, "--notes-file", NOTES_FILE, "--latest"]
        }
      ]
    : [
        {
          command: "gh",
          args: [
            "release",
            "create",
            tag,
            ...assets,
            "--title",
            `${GEMINI_LIVE_NAME} ${version}`,
            "--notes-file",
            NOTES_FILE,
            "--latest"
          ]
        }
      ];
  for (const command of commands) {
    if (isDryRun) {
      console.log(`  (dry run) $ ${toCommandLine(command)}`);
      continue;
    }

    mustRunCommand(command);
  }
}

function main() {
  mustRunCommand({
    command: "pnpm",
    args: ["--dir", EXTENSION_DIR, "zip"]
  });
  const { version, key: manifestKey } = readManifest();
  const keyPath = ensureSigningKey();
  packCrx(keyPath);
  warnOnIdMismatch({
    keyPath,
    manifestKey
  });

  mkdirSync(RELEASE_DIR, { recursive: true });
  const zipPath = join(RELEASE_DIR, GeminiLiveAsset.ZIP);
  const crxPath = join(RELEASE_DIR, GeminiLiveAsset.CRX);
  copyFileSync(newestZip(), zipPath);
  copyFileSync(PACKED_CRX, crxPath);

  publish({
    version,
    assets: [zipPath, crxPath]
  });
  console.log(`\n${isDryRun ? "Would publish" : "Published"} ${geminiLiveTag(version)}, notes in ${NOTES_FILE}:`);
  for (const asset of Object.values(GeminiLiveAsset)) {
    console.log(`  ${geminiLiveDownloadUrl(asset)}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
