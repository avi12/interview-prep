import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { DIST_DIR } from "#scripts/lib/paths.ts";

export const NARRATED_DIR = resolve(DIST_DIR, "narrated");
export const NARRATION_INPUT_DIR = resolve(DIST_DIR, "narration-input");

const STYLE_BLOCK_PATTERN = /<style>[\s\S]*?<\/style>/;

const fileSafe = (id: string) => id.replaceAll("/", "__");

export const narrationKey = (html: string) =>
  createHash("sha1").update(html.replace(STYLE_BLOCK_PATTERN, "")).digest("hex").slice(0, 12);

export const narratedPath = ({ id, html }: { id: string; html: string }) =>
  resolve(NARRATED_DIR, `${fileSafe(id)}-${narrationKey(html)}.html`);

export const narratedInputPath = (id: string) => resolve(NARRATION_INPUT_DIR, `${fileSafe(id)}.html`);

export const withCachedNarration = ({ id, html }: { id: string; html: string }) => {
  const path = narratedPath({ id, html });
  if (!existsSync(path)) return { html, isNarrated: false };
  const freshStyle = STYLE_BLOCK_PATTERN.exec(html)?.[0] ?? "";
  const narrated = readFileSync(path, "utf8").replace(STYLE_BLOCK_PATTERN, () => freshStyle);
  return { html: narrated, isNarrated: true };
};

export const removeStaleNarrations = ({ id, keepPath }: { id: string; keepPath: string }) => {
  if (!existsSync(NARRATED_DIR)) return;
  for (const name of readdirSync(NARRATED_DIR)) {
    const path = resolve(NARRATED_DIR, name);
    const isOwn = name.startsWith(`${fileSafe(id)}-`);
    if (isOwn && path !== keepPath) rmSync(path);
  }
};
