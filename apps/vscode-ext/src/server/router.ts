import { isTrustedRequest } from "@/server/guard.ts";
import { HttpStatus, sendStatus } from "@/server/respond.ts";
import { SERVER_HOST, serverOrigin, TUTOR_VIEW_PORT } from "@scripts/lib/server.ts";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import * as vscode from "vscode";

export interface Exchange {
  request: IncomingMessage;
  response: ServerResponse;
  pathname: string;
}

export interface Route {
  isMatch: (pathname: string) => boolean;
  isGuarded: boolean;
  handle: (exchange: Exchange) => Promise<void> | void;
}

const BASE_URL = serverOrigin(TUTOR_VIEW_PORT);

function pathnameOf(url = "") {
  return URL.canParse(url, BASE_URL) ? new URL(url, BASE_URL).pathname : undefined;
}

function findRoute({ routes, pathname }: {
  routes: readonly Route[];
  pathname: string | undefined;
}) {
  return pathname === undefined ? undefined : routes.find(candidate => candidate.isMatch(pathname));
}

async function dispatch({ routes, request, response }: {
  routes: readonly Route[];
  request: IncomingMessage;
  response: ServerResponse;
}) {
  const pathname = pathnameOf(request.url);
  const route = findRoute({
    routes,
    pathname
  });
  if (!route || pathname === undefined) {
    return sendStatus({
      response,
      status: HttpStatus.NOT_FOUND
    });
  }

  if (route.isGuarded && !isTrustedRequest(request.headers)) {
    return sendStatus({
      response,
      status: HttpStatus.FORBIDDEN
    });
  }

  await route.handle({
    request,
    response,
    pathname
  });
}

export function serveRoutes(routes: readonly Route[]) {
  const server = createServer((request, response) => {
    dispatch({
      routes,
      request,
      response
    }).catch(() => {
      if (response.headersSent) {
        response.destroy();
        return;
      }

      sendStatus({
        response,
        status: HttpStatus.SERVER_ERROR
      });
    });
  });
  server.on("error", () => server.close());
  server.listen(TUTOR_VIEW_PORT, SERVER_HOST);
  return new vscode.Disposable(() => server.close());
}
