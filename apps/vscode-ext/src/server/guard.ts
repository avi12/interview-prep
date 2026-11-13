import type { IncomingHttpHeaders } from "node:http";

import { SERVER_HOST, serverOrigin, TUTOR_VIEW_PORT } from "@scripts/lib/server.ts";

const TRUSTED_HOST = `${SERVER_HOST}:${TUTOR_VIEW_PORT}`;
const TRUSTED_ORIGIN = serverOrigin(TUTOR_VIEW_PORT);

export function isTrustedRequest({ host, origin }: Pick<IncomingHttpHeaders, "host" | "origin">) {
  const isUntrustedHost = host !== TRUSTED_HOST;
  if (isUntrustedHost) {
    return false;
  }

  return origin === undefined || origin === TRUSTED_ORIGIN;
}
