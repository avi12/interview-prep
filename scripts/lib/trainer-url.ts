import { ROOT, TOKEN_FILE } from "#scripts/lib/paths.ts";
import { existsSync, readFileSync } from "node:fs";

function toUrlPath(path: string) {
  return `/${path.replaceAll("\\", "/")}`;
}

export function readToken() {
  return existsSync(TOKEN_FILE) ? readFileSync(TOKEN_FILE, "utf8").trim() : null;
}

export function trainerUrl({ origin, token }: {
  origin: string;
  token: string;
}) {
  return `${origin}/?tkn=${token}&folder=${encodeURIComponent(toUrlPath(ROOT))}`;
}
