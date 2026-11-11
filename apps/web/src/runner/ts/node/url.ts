const FILE_PROTOCOL = "file://";

export function fileURLToPath(url: string | URL) {
  return decodeURIComponent(new URL(url).pathname);
}

function pathToFileURL(path: string) {
  return new URL(`${FILE_PROTOCOL}${encodeURI(path)}`);
}

const api = {
  fileURLToPath,
  pathToFileURL,
  URL,
  URLSearchParams
};

export const nodeUrl = {
  ...api,
  default: api
};
