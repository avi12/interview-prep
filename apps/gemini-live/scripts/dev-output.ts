import { z } from "../src/lib/zod.ts";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const MANIFEST_FILE = "manifest.json";
const HASH_ALGORITHM = "sha1";

const manifestSchema = z.object({
  background: z.object({ service_worker: z.string() }).optional(),
  content_scripts: z.array(
    z.object({
      matches: z.array(z.string()),
      js: z.array(z.string()).default([]),
      css: z.array(z.string()).default([])
    })
  ).default([])
});

type OutputFingerprint = Map<string, string>;

function toPosix(path: string) {
  return path.replaceAll("\\", "/");
}

export function fingerprintOutput(outDir: string) {
  const fingerprint: OutputFingerprint = new Map();
  if (!existsSync(outDir)) {
    return fingerprint;
  }

  for (const entry of readdirSync(outDir, {
    recursive: true,
    withFileTypes: true
  })) {
    if (!entry.isFile()) {
      continue;
    }

    const path = join(entry.parentPath, entry.name);
    fingerprint.set(toPosix(relative(outDir, path)), createHash(HASH_ALGORITHM).update(readFileSync(path)).digest("hex"));
  }
  return fingerprint;
}

function changedFiles({ before, after }: {
  before: OutputFingerprint;
  after: OutputFingerprint;
}) {
  const changed = new Set<string>();
  for (const [file, hash] of after) {
    if (before.get(file) !== hash) {
      changed.add(file);
    }
  }

  for (const file of before.keys()) {
    if (!after.has(file)) {
      changed.add(file);
    }
  }
  return changed;
}

export function planReload({ outDir, before, after }: {
  outDir: string;
  before: OutputFingerprint;
  after: OutputFingerprint;
}) {
  const changed = changedFiles({
    before,
    after
  });
  const manifest = manifestSchema.parse(JSON.parse(readFileSync(join(outDir, MANIFEST_FILE), "utf8")));
  const backgroundFiles = manifest.background ? [manifest.background.service_worker] : [];
  const extensionFiles = new Set([MANIFEST_FILE, ...backgroundFiles]);
  const contentScripts = manifest.content_scripts.map(({ matches, js, css }) => ({
    matches,
    files: [...js, ...css]
  }));
  const contentScriptFiles = new Set(contentScripts.flatMap(({ files }) => files));
  const isExtensionChanged = [...extensionFiles].some(file => changed.has(file));
  const reloadedContentScripts = isExtensionChanged
    ? contentScripts
    : contentScripts.filter(({ files }) => files.some(file => changed.has(file)));
  const isPageChanged = [...changed].some(file => !extensionFiles.has(file) && !contentScriptFiles.has(file));
  return {
    isChanged: changed.size > 0,
    isExtensionChanged,
    tabPatterns: [...new Set(reloadedContentScripts.flatMap(({ matches }) => matches))],
    isPageChanged: isExtensionChanged || isPageChanged
  };
}

export type ReloadPlan = ReturnType<typeof planReload>;
