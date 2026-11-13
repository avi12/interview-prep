const PATH_SEPARATOR = "/";
const FILE_SCHEME = "file";

export class Uri {
  readonly scheme: string;
  readonly path: string;

  private constructor({ scheme, path }: { scheme: string; path: string }) {
    this.scheme = scheme;
    this.path = path;
  }

  static file(path: string) {
    return new Uri({
      scheme: FILE_SCHEME,
      path: path.replaceAll("\\", PATH_SEPARATOR)
    });
  }

  static joinPath(base: Uri, ...segments: string[]) {
    return new Uri({
      scheme: base.scheme,
      path: [base.path, ...segments].join(PATH_SEPARATOR).replaceAll(/\/+/g, PATH_SEPARATOR)
    });
  }

  toString() {
    return `${this.scheme}://${this.path}`;
  }
}

export class Disposable {
  private readonly onDispose: () => unknown;

  constructor(onDispose: () => unknown) {
    this.onDispose = onDispose;
  }

  dispose() {
    this.onDispose();
  }
}

export class EventEmitter<T> {
  private listeners = new Set<(value: T) => unknown>();

  readonly event = (listener: (value: T) => unknown) => {
    this.listeners.add(listener);
    return new Disposable(() => this.listeners.delete(listener));
  };

  fire(value: T) {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  dispose() {
    this.listeners.clear();
  }
}

export const FileType = {
  File: 1,
  Directory: 2
};

const files = new Map<string, Uint8Array>();

function isInside({ dir, path }: { dir: string; path: string }) {
  return path.startsWith(`${dir}${PATH_SEPARATOR}`);
}

function missing(uri: Uri) {
  return new Error(`No file at ${uri.path}`);
}

export const workspace = {
  saveAll: async () => true,
  fs: {
    async stat(uri: Uri) {
      const isFile = files.has(uri.path);
      function isInsideUri(path: string) {
        return isInside({
          dir: uri.path,
          path
        });
      }
      const isDirectory = [...files.keys()].some(isInsideUri);
      const isMissingEntry = !isFile && !isDirectory;
      if (isMissingEntry) {
        throw missing(uri);
      }

      return { type: isFile ? FileType.File : FileType.Directory };
    },
    async readFile(uri: Uri) {
      const content = files.get(uri.path);
      if (!content) {
        throw missing(uri);
      }

      return content;
    },
    async writeFile(uri: Uri, content: Uint8Array) {
      files.set(uri.path, content);
    },
    async readDirectory(uri: Uri) {
      const entries = new Map<string, number>();
      for (const path of files.keys()) {
        if (
          !isInside({
            dir: uri.path,
            path
          })
        ) {
          continue;
        }

        const [name, ...rest] = path.slice(uri.path.length + 1).split(PATH_SEPARATOR);
        entries.set(name, rest.length > 0 ? FileType.Directory : FileType.File);
      }
      return [...entries];
    },
    async delete(uri: Uri) {
      for (const path of files.keys()) {
        const isSamePath =
          path === uri.path ||
          isInside({
            dir: uri.path,
            path
          });
        if (isSamePath) {
          files.delete(path);
        }
      }
    }
  }
};

export function resetFakeFiles() {
  files.clear();
}
