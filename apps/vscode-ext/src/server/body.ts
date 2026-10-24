import type { IncomingMessage } from "node:http";

const MAX_BODY_BYTES = 4096;

async function readText(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;

    if (size > MAX_BODY_BYTES) {
      return null;
    }

    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function readJsonBody(request: IncomingMessage) {
  const text = await readText(request);
  return text === null ? undefined : parseJson(text);
}
