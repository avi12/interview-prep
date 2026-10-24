import type { ApiKeyStore } from "@/apiKey.ts";
import { readJsonBody } from "@/server/body.ts";
import { HttpStatus, sendJson, sendMethodNotAllowed, sendStatus } from "@/server/respond.ts";
import type { Exchange, Route } from "@/server/router.ts";
import { API_KEY_PATH, apiKeyUpdateSchema } from "@scripts/lib/voice.ts";

const HttpMethod = {
  GET: "GET",
  PUT: "PUT",
  DELETE: "DELETE"
} as const;
const ALLOWED_METHODS = Object.values(HttpMethod);

async function saveFromBody({ store, exchange }: {
  store: ApiKeyStore;
  exchange: Exchange;
}) {
  const update = apiKeyUpdateSchema.safeParse(await readJsonBody(exchange.request));
  if (!update.success) {
    return null;
  }

  return store.save(update.data.key);
}

async function respondFor({ store, exchange }: {
  store: ApiKeyStore;
  exchange: Exchange;
}) {
  const { method } = exchange.request;
  if (method === HttpMethod.GET) {
    return store.read();
  }

  if (method === HttpMethod.DELETE) {
    return store.clear();
  }

  return saveFromBody({
    store,
    exchange
  });
}

export function apiKeyRoute(store: ApiKeyStore): Route {
  return {
    isMatch: pathname => pathname === API_KEY_PATH,
    isGuarded: true,
    async handle(exchange) {
      const { response, request } = exchange;
      if (!ALLOWED_METHODS.some(method => method === request.method)) {
        return sendMethodNotAllowed({
          response,
          allowed: ALLOWED_METHODS
        });
      }

      const result = await respondFor({
        store,
        exchange
      });
      if (!result) {
        return sendStatus({
          response,
          status: HttpStatus.BAD_REQUEST
        });
      }

      sendJson({
        response,
        body: JSON.stringify(result)
      });
    }
  };
}
