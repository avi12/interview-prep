import type { EdgeTts } from "@server/edge-tts/service.ts";
import { CacheControl, ErrorCode, HttpStatus, noStore, sendError, sendJson } from "@server/http.ts";
import type { Log } from "@server/logging.ts";
import type { NarrationCards } from "@server/narration-source.ts";
import { narrationStream } from "@server/narration-stream.ts";
import { type RateLimitOptions, rateLimitPerIp } from "@server/rate-limit.ts";
import { CORP_RESPONSE_HEADER, CROSS_ORIGIN_RESOURCE } from "@server/security.ts";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { DEFAULT_VOICE } from "#scripts/lib/edge-tts/constants.ts";
import { detectLanguage, pickVoice } from "#scripts/lib/edge-tts/language.ts";
import { parseNarrationScript } from "#scripts/lib/edge-tts/script.ts";
import { voicesSchema } from "#scripts/lib/edge-tts/voice.ts";
import {
  NARRATE_PATH,
  NARRATE_STREAM_CONTENT_TYPE,
  NARRATE_STREAM_PATH,
  NARRATE_VOICES_PATH,
  NarrateQuery
} from "#scripts/lib/narration-stream.ts";
import { zod } from "#scripts/lib/zod.ts";

const ANY_ORIGIN = "*";
const GET_METHOD = "GET";

const querySchema = zod.object({
  [NarrateQuery.LESSON]: zod.string().min(1),
  [NarrateQuery.CARD]: zod.coerce.number().int().min(1),
  [NarrateQuery.VOICE]: zod.string().min(1).optional()
});

async function chooseVoice({ edgeTts, requested, text }: { edgeTts: EdgeTts; requested?: string; text: string }) {
  if (requested !== undefined) {
    const voices = await edgeTts.listVoices();
    return voices.some(voice => voice.ShortName === requested) ? requested : null;
  }

  const language = detectLanguage(text);
  if (language === null) {
    return DEFAULT_VOICE;
  }

  return pickVoice({
    voices: await edgeTts.listVoices(),
    locale: language,
    preferredVoice: DEFAULT_VOICE
  });
}

export function narrateRoutes({
  edgeTts,
  cardsByLesson,
  rateLimit,
  log
}: {
  edgeTts: EdgeTts;
  cardsByLesson: Map<string, NarrationCards>;
  rateLimit: RateLimitOptions;
  log: Log;
}) {
  return new Hono()
    .use(noStore)
    .use(
      cors({
        origin: ANY_ORIGIN,
        allowMethods: [GET_METHOD]
      })
    )
    .use(async (context, next) => {
      await next();
      context.res.headers.set(CORP_RESPONSE_HEADER, CROSS_ORIGIN_RESOURCE);
    })
    .use(rateLimitPerIp(rateLimit))
    .get(NARRATE_VOICES_PATH.slice(NARRATE_PATH.length), async context =>
      sendJson({
        context,
        schema: voicesSchema,
        value: await edgeTts.listVoices()
      })
    )
    .get(NARRATE_STREAM_PATH.slice(NARRATE_PATH.length), async context => {
      function notFound() {
        return sendError({
          context,
          status: HttpStatus.NOT_FOUND,
          error: ErrorCode.NOT_FOUND
        });
      }

      const query = querySchema.safeParse(context.req.query());
      if (!query.success) {
        return notFound();
      }

      const script = cardsByLesson
        .get(query.data[NarrateQuery.LESSON])
        ?.find(card => card.card === query.data[NarrateQuery.CARD])?.script;
      if (script === undefined) {
        return notFound();
      }

      const voice = await chooseVoice({
        edgeTts,
        requested: query.data[NarrateQuery.VOICE],
        text: parseNarrationScript(script).text
      });
      if (voice === null) {
        return notFound();
      }

      context.header("content-type", NARRATE_STREAM_CONTENT_TYPE);
      context.header("cache-control", CacheControl.NO_STORE);
      return context.body(
        narrationStream({
          edgeTts,
          script,
          voice,
          log
        })
      );
    });
}
