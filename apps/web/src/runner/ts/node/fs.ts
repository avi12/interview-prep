import { Buffer } from "buffer";

import { dirname, join, normalize } from "pathe";

type PathLike = string | URL;
type ReadOptions = string | { encoding?: string | null } | null | undefined;
interface CopyOptions {
  recursive?: boolean;
  filter?: (source: string, destination: string) => boolean;
}

const FILE_URL_PROTOCOL = "file:";
const TEMP_SUFFIX_LENGTH = 6;
const TEMP_SUFFIX_RADIX = 36;
const ERROR_CODE = {
  MISSING: "ENOENT",
  IS_DIRECTORY: "EISDIR"
} as const;

const files = new Map<string, string>();
const directories = new Set<string>(["/"]);
const modifiedAt = new Map<string, number>();
let tempCounter = 0;

function toPath(path: PathLike) {
  const isUrlPath = path instanceof URL;
  if (isUrlPath) {
    return decodeURIComponent(path.pathname);
  }

  if (path.startsWith(FILE_URL_PROTOCOL)) {
    return decodeURIComponent(new URL(path).pathname);
  }

  return normalize(path);
}

function fsError({ code, syscall, path }: { code: string; syscall: string; path: string }) {
  return Object.assign(new Error(`${code}: no such file or directory, ${syscall} '${path}'`), {
    code,
    syscall,
    path
  });
}

function addParents(path: string) {
  let current = dirname(path);
  while (!directories.has(current)) {
    directories.add(current);
    current = dirname(current);
  }
}

function isDirectory(path: string) {
  return directories.has(path);
}

function childrenOf(path: string) {
  const prefix = path.endsWith("/") ? path : `${path}/`;
  const names = new Set<string>();
  for (const entry of [...files.keys(), ...directories]) {
    const isChildEntry = entry.startsWith(prefix) && entry !== prefix;
    if (isChildEntry) {
      names.add(entry.slice(prefix.length).split("/")[0]);
    }
  }
  return [...names].sort();
}

function encodingOf(options: ReadOptions) {
  if (typeof options === "string") {
    return options;
  }

  return options?.encoding ?? null;
}

export function loadFiles(entries: Record<string, string>) {
  for (const [path, text] of Object.entries(entries)) {
    writeFileSync(path, text);
  }
}

export function existsSync(path: PathLike) {
  const resolved = toPath(path);
  return files.has(resolved) || isDirectory(resolved);
}

export function readFileSync(path: PathLike, options?: ReadOptions) {
  const resolved = toPath(path);
  const text = files.get(resolved);
  if (text === undefined) {
    throw fsError({
      code: isDirectory(resolved) ? ERROR_CODE.IS_DIRECTORY : ERROR_CODE.MISSING,
      syscall: "open",
      path: resolved
    });
  }

  const encoding = encodingOf(options);
  return encoding ? text : Buffer.from(text);
}

function writeFileSync(path: PathLike, data: string | Uint8Array) {
  const resolved = toPath(path);
  addParents(resolved);
  files.set(resolved, typeof data === "string" ? data : new TextDecoder().decode(data));
  modifiedAt.set(resolved, Date.now());
}

function appendFileSync(path: PathLike, data: string) {
  const resolved = toPath(path);
  writeFileSync(resolved, `${files.get(resolved) ?? ""}${data}`);
}

function mkdirSync(path: PathLike) {
  const resolved = toPath(path);
  addParents(join(resolved, "x"));
  modifiedAt.set(resolved, Date.now());
  return resolved;
}

function rmSync(path: PathLike) {
  const resolved = toPath(path);
  const prefix = `${resolved}/`;
  files.delete(resolved);
  directories.delete(resolved);
  for (const key of files.keys()) {
    if (key.startsWith(prefix)) {
      files.delete(key);
    }
  }
  for (const key of directories) {
    if (key.startsWith(prefix)) {
      directories.delete(key);
    }
  }
}

function readdirSync(path: PathLike) {
  const resolved = toPath(path);
  if (!isDirectory(resolved)) {
    throw fsError({
      code: ERROR_CODE.MISSING,
      syscall: "scandir",
      path: resolved
    });
  }

  return childrenOf(resolved);
}

export function statSync(path: PathLike) {
  const resolved = toPath(path);
  if (!existsSync(resolved)) {
    throw fsError({
      code: ERROR_CODE.MISSING,
      syscall: "stat",
      path: resolved
    });
  }

  const isDir = isDirectory(resolved);
  return {
    mtimeMs: modifiedAt.get(resolved) ?? 0,
    size: files.get(resolved)?.length ?? 0,
    isDirectory: () => isDir,
    isFile: () => !isDir
  };
}

function cpSync(source: PathLike, destination: PathLike, options: CopyOptions = {}) {
  const from = toPath(source);
  const to = toPath(destination);
  const isFilteredOut = options.filter && !options.filter(from, to);
  if (isFilteredOut) {
    return;
  }

  if (!isDirectory(from)) {
    writeFileSync(to, readFileSync(from, "utf8"));
    return;
  }

  mkdirSync(to);
  for (const name of childrenOf(from)) {
    cpSync(join(from, name), join(to, name), options);
  }
}

function mkdtempSync(prefix: string) {
  tempCounter++;
  const suffix =
    `${tempCounter.toString(TEMP_SUFFIX_RADIX)}${Math.random().toString(TEMP_SUFFIX_RADIX).slice(2)}`.slice(
      0,
      TEMP_SUFFIX_LENGTH
    );
  return mkdirSync(`${prefix}${suffix}`);
}

export function filesUnder(path: string) {
  const prefix = `${toPath(path)}/`;
  const found: Record<string, string> = {};
  for (const [key, text] of files) {
    if (key.startsWith(prefix)) {
      found[key] = text;
    }
  }
  return found;
}

export const promises = {
  rm: async (path: PathLike) => rmSync(path),
  readFile: async (path: PathLike, options?: ReadOptions) => readFileSync(path, options),
  writeFile: async (path: PathLike, data: string) => writeFileSync(path, data),
  mkdir: async (path: PathLike) => mkdirSync(path),
  readdir: async (path: PathLike) => readdirSync(path)
};

export const nodeFs = {
  existsSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  statSync,
  cpSync,
  mkdtempSync,
  promises
};
