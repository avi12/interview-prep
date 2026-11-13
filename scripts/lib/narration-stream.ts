import { zod } from "#scripts/lib/zod.ts";

export const NARRATE_PATH = "/narrate";
export const NARRATE_VOICES_PATH = `${NARRATE_PATH}/voices`;
export const NARRATE_STREAM_PATH = `${NARRATE_PATH}/stream`;
export const NARRATE_STREAM_CONTENT_TYPE = "application/octet-stream";

export const NarrateQuery = {
  LESSON: "lesson",
  CARD: "card",
  VOICE: "voice"
} as const;

export const FrameKind = {
  META: "meta",
  AUDIO: "audio",
  WORD: "word"
} as const;

type FrameKindValue = (typeof FrameKind)[keyof typeof FrameKind];

const FRAME_TAGS: Record<FrameKindValue, number> = {
  [FrameKind.META]: 1,
  [FrameKind.AUDIO]: 2,
  [FrameKind.WORD]: 3
};

const FRAME_TAG_BYTES = 1;
const FRAME_LENGTH_BYTES = 4;
const FRAME_HEADER_BYTES = FRAME_TAG_BYTES + FRAME_LENGTH_BYTES;
const MAX_PAYLOAD_BYTES = 16 * 1024 * 1024;

const narrationMetaSchema = zod.object({
  voice: zod.string(),
  locale: zod.string(),
  mimeType: zod.string(),
  text: zod.string(),
  cues: zod.array(
    zod.object({
      name: zod.string(),
      start: zod.number().int().min(0)
    })
  )
});

const narrationWordSchema = zod.object({
  offsetSeconds: zod.number().min(0),
  textStart: zod.number().int().min(0),
  textLength: zod.number().int().min(0)
});

export type NarrationMeta = zod.infer<typeof narrationMetaSchema>;
export type NarrationWord = zod.infer<typeof narrationWordSchema>;

export type NarrationFrame =
  | ({ kind: typeof FrameKind.META } & NarrationMeta)
  | {
      kind: typeof FrameKind.AUDIO;
      bytes: Uint8Array;
    }
  | ({ kind: typeof FrameKind.WORD } & NarrationWord);

function payloadOf(frame: NarrationFrame) {
  if (frame.kind === FrameKind.AUDIO) {
    return frame.bytes;
  }

  const schema = frame.kind === FrameKind.META ? narrationMetaSchema : narrationWordSchema;
  return new TextEncoder().encode(JSON.stringify(schema.parse(frame)));
}

export function encodeFrame(frame: NarrationFrame) {
  const payload = payloadOf(frame);
  const encoded = new Uint8Array(FRAME_HEADER_BYTES + payload.byteLength);
  encoded[0] = FRAME_TAGS[frame.kind];
  new DataView(encoded.buffer).setUint32(FRAME_TAG_BYTES, payload.byteLength);
  encoded.set(payload, FRAME_HEADER_BYTES);
  return encoded;
}

function kindOfTag(tag: number) {
  for (const kind of Object.values(FrameKind)) {
    if (FRAME_TAGS[kind] === tag) {
      return kind;
    }
  }

  throw new Error(`Unknown narration frame tag ${tag}`);
}

function parsePayload<T>({ schema, payload }: { schema: zod.ZodType<T>; payload: Uint8Array }) {
  const parsed = schema.safeParse(JSON.parse(new TextDecoder().decode(payload)));
  if (!parsed.success) {
    throw new Error("Invalid narration frame payload");
  }

  return parsed.data;
}

function decodeFrame({ tag, payload }: { tag: number; payload: Uint8Array }) {
  const kind = kindOfTag(tag);
  if (kind === FrameKind.AUDIO) {
    return {
      kind,
      bytes: payload
    };
  }

  if (kind === FrameKind.META) {
    return {
      kind,
      ...parsePayload({
        schema: narrationMetaSchema,
        payload
      })
    };
  }

  return {
    kind,
    ...parsePayload({
      schema: narrationWordSchema,
      payload
    })
  };
}

function concatenate({ first, second }: { first: Uint8Array; second: Uint8Array }) {
  const joined = new Uint8Array(first.byteLength + second.byteLength);
  joined.set(first);
  joined.set(second, first.byteLength);
  return joined;
}

function takeFrame(pending: Uint8Array) {
  if (pending.byteLength < FRAME_HEADER_BYTES) {
    return null;
  }

  const view = new DataView(pending.buffer, pending.byteOffset, pending.byteLength);
  const payloadLength = view.getUint32(FRAME_TAG_BYTES);
  if (payloadLength > MAX_PAYLOAD_BYTES) {
    throw new Error("Narration frame is too large");
  }

  const frameEnd = FRAME_HEADER_BYTES + payloadLength;
  if (pending.byteLength < frameEnd) {
    return null;
  }

  return {
    frame: decodeFrame({
      tag: view.getUint8(0),
      payload: pending.subarray(FRAME_HEADER_BYTES, frameEnd)
    }),
    rest: pending.subarray(frameEnd)
  };
}

export async function* decodeFrames(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  let pending: Uint8Array = new Uint8Array(0);
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    pending = concatenate({
      first: pending,
      second: value
    });
    let taken = takeFrame(pending);
    while (taken !== null) {
      yield taken.frame;
      pending = taken.rest;
      taken = takeFrame(pending);
    }
  }

  if (pending.byteLength > 0) {
    throw new Error("Narration stream ended inside a frame");
  }
}
