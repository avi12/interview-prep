import { DIST_DIR } from "#scripts/lib/paths.ts";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const NARRATED_DIR = resolve(DIST_DIR, "narrated");
const NARRATION_INPUT_DIR = resolve(DIST_DIR, "narration-input");

const SPOKEN_ATTRIBUTE_PATTERN = /\s(?:data-narrate|data-narrate-voice|lang)="[^"]*"/g;
const NARRATION_BLOCK_PATTERN = /<!-- narration:start -->[\s\S]*?<!-- narration:end -->/;

function fileSafe(id: string) {
  return id.replaceAll("/", "__");
}

function narrationKey(html: string) {
  const spoken = html.match(SPOKEN_ATTRIBUTE_PATTERN)?.join("\n") ?? "";
  return createHash("sha1").update(spoken).digest("hex").slice(0, 12);
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

  const block = NARRATION_BLOCK_PATTERN.exec(readFileSync(path, "utf8"))?.[0];
  if (!block) {
    return {
      html,
      isNarrated: false
    };
  }

  return {
    html: `${html.trimEnd()}\n${block}\n`,
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
