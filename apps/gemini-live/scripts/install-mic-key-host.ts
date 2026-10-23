import { extensionId } from "../extension-identity.ts";
import { MIC_KEY_HOST } from "../src/lib/mic-key-host.ts";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const CSC = join(process.env.WINDIR ?? "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
const NATIVE_DIR = join(import.meta.dirname, "..", "native");
const BIN_DIR = join(NATIVE_DIR, "bin");
const SOURCE = join(NATIVE_DIR, "MicKeyHost.cs");
const EXECUTABLE = join(BIN_DIR, "mic-key-host.exe");
const MANIFEST = join(BIN_DIR, `${MIC_KEY_HOST}.json`);
const BROWSER_KEYS = ["Google\\Chrome", "Google\\Chrome for Testing"];
if (process.platform !== "win32") {
  console.log("The M1 key host reads a Windows HID device; nothing to install on this platform");
  process.exit(0);
}

mkdirSync(BIN_DIR, { recursive: true });
execFileSync(CSC, ["-nologo", "-optimize", "-target:exe", `-out:${EXECUTABLE}`, SOURCE], { stdio: "inherit" });
writeFileSync(
  MANIFEST,
  JSON.stringify(
    {
      name: MIC_KEY_HOST,
      description: "Tells the Gemini Live tutor when the ROCCAT M1 key is pressed",
      path: EXECUTABLE,
      type: "stdio",
      allowed_origins: [`chrome-extension://${extensionId()}/`]
    },
    null,
    2
  )
);
for (const browserKey of BROWSER_KEYS) {
  const registryKey = `HKCU\\Software\\${browserKey}\\NativeMessagingHosts\\${MIC_KEY_HOST}`;
  execFileSync("reg", ["add", registryKey, "/ve", "/t", "REG_SZ", "/d", MANIFEST, "/f"], { stdio: "ignore" });
}

console.log(`M1 key host installed for ${BROWSER_KEYS.join(" and ")} (extension ${extensionId()})`);
