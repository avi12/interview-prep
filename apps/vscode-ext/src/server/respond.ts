import type { ServerResponse } from "node:http";

export const HttpStatus = {
  OK: 200,
  FOUND: 302,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const;
type HttpStatus = (typeof HttpStatus)[keyof typeof HttpStatus];

const NO_STORE = "no-store";
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";

export function sendStatus({ response, status }: {
  response: ServerResponse;
  status: HttpStatus;
}) {
  response.writeHead(status, { "cache-control": NO_STORE }).end();
}

export function sendJson({ response, body, status = HttpStatus.OK }: {
  response: ServerResponse;
  body: string;
  status?: HttpStatus;
}) {
  response.writeHead(status, {
    "content-type": JSON_CONTENT_TYPE,
    "cache-control": NO_STORE
  }).end(body);
}

export function sendData({ response, body, contentType, status = HttpStatus.OK }: {
  response: ServerResponse;
  body: Buffer | string;
  contentType: string;
  status?: HttpStatus;
}) {
  response.writeHead(status, {
    "content-type": contentType,
    "cache-control": NO_STORE,
    "x-content-type-options": "nosniff"
  }).end(body);
}

export function sendRedirect({ response, location }: {
  response: ServerResponse;
  location: string;
}) {
  response.writeHead(HttpStatus.FOUND, {
    location,
    "cache-control": NO_STORE
  }).end();
}

export function sendMethodNotAllowed({ response, allowed }: {
  response: ServerResponse;
  allowed: readonly string[];
}) {
  response.writeHead(HttpStatus.METHOD_NOT_ALLOWED, {
    allow: allowed.join(", "),
    "cache-control": NO_STORE
  }).end();
}
