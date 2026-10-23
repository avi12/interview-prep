import { DIST_DIR } from "#scripts/lib/paths.ts";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

export const NARRATED_DIR = resolve(DIST_DIR, "narrated");
export const NARRATION_INPUT_DIR = resolve(DIST_DIR, "narration-input");

const STYLE_BLOCK_PATTERN = /<style>[\s\S]*?<\/style>/;

function fileSafe(id: string) {
  return id.replaceAll("/", "__");
}

export function narrationKey(html: string) {
  return createHash("sha1").update(html.replace(STYLE_BLOCK_PATTERN, "")).digest("hex").slice(0, 12);
}

export function narratedPath({ id, html }: {
  id: string;
  html: string;
}) {
  return resolve(NARRATED_DIR, `${fileSafe(id)}-${narrationKey(html)}.html`);
}

export function narratedInputPath(id: string) {
  return resolve(NARRATION_INPUT_DIR, `${fileSafe(id)}.html`);
}

export function withCachedNarration({ id, html }: {
  id: string;
  html: string;
}) {
  const path = narratedPath({
    id,
    html
  });
  if (!existsSync(path)) {
    return {
      html,
      isNarrated: false
    };
  }

  const freshStyle = STYLE_BLOCK_PATTERN.exec(html)?.[0] ?? "";
  const narrated = readFileSync(path, "utf8").replace(STYLE_BLOCK_PATTERN, () => freshStyle);
  return {
    html: narrated,
    isNarrated: true
  };
}

export function removeStaleNarrations({ id, keepPath }: {
  id: string;
  keepPath: string;
}) {
  if (!existsSync(NARRATED_DIR)) {
    return;
  }

  for (const name of readdirSync(NARRATED_DIR)) {
    const path = resolve(NARRATED_DIR, name);
    const isOwn = name.startsWith(`${fileSafe(id)}-`);
    if (isOwn && path !== keepPath) {
      rmSync(path);
    }
  }
}
