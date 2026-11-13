import { OUTPUT_FORMAT, TICKS_PER_SECOND } from "#scripts/lib/edge-tts/constants.ts";
import { unescapeXml } from "#scripts/lib/edge-tts/ssml.ts";
import { zod } from "#scripts/lib/zod.ts";

export const FramePath = {
  SPEECH_CONFIG: "speech.config",
  SSML: "ssml",
  AUDIO_METADATA: "audio.metadata",
  TURN_END: "turn.end",
  AUDIO: "audio"
} as const;

const Header = {
  REQUEST_ID: "X-RequestId",
  TIMESTAMP: "X-Timestamp",
  CONTENT_TYPE: "Content-Type",
  PATH: "Path"
} as const;

const LINE_BREAK = "\r\n";
const HEADER_SEPARATOR = ":";
const HEADER_BODY_SEPARATOR = `${LINE_BREAK}${LINE_BREAK}`;
const BINARY_HEADER_LENGTH_BYTES = 2;
const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const SSML_CONTENT_TYPE = "application/ssml+xml";
const WORD_BOUNDARY_TYPE = "WordBoundary";

const metadataSchema = zod.object({
  Metadata: zod.array(
    zod.object({
      Type: zod.string(),
      Data: zod.unknown()
    })
  )
});

const wordBoundaryDataSchema = zod.object({
  Offset: zod.number(),
  Duration: zod.number(),
  text: zod.object({ Text: zod.string() })
});

export interface WordBoundary {
  time: number;
  duration: number;
  text: string;
}

export function createId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function createTimestamp() {
  return `${new Date().toString()}Z`;
}

function formatTextFrame({ headers, body }: { headers: Record<string, string>; body: string }) {
  let head = "";
  for (const [name, value] of Object.entries(headers)) {
    head += `${name}${HEADER_SEPARATOR}${value}${LINE_BREAK}`;
  }

  return `${head}${LINE_BREAK}${body}`;
}

export function configMessage() {
  const config = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: "false",
            wordBoundaryEnabled: "true"
          },
          outputFormat: OUTPUT_FORMAT
        }
      }
    }
  };
  return formatTextFrame({
    headers: {
      [Header.TIMESTAMP]: createTimestamp(),
      [Header.CONTENT_TYPE]: JSON_CONTENT_TYPE,
      [Header.PATH]: FramePath.SPEECH_CONFIG
    },
    body: JSON.stringify(config)
  });
}

export function ssmlMessage({ requestId, ssml }: { requestId: string; ssml: string }) {
  return formatTextFrame({
    headers: {
      [Header.REQUEST_ID]: requestId,
      [Header.CONTENT_TYPE]: SSML_CONTENT_TYPE,
      [Header.TIMESTAMP]: createTimestamp(),
      [Header.PATH]: FramePath.SSML
    },
    body: ssml
  });
}

function parseHeaders(block: string) {
  const headers: Record<string, string> = {};
  for (const line of block.split(LINE_BREAK)) {
    const iSeparator = line.indexOf(HEADER_SEPARATOR);
    if (iSeparator > 0) {
      headers[line.slice(0, iSeparator)] = line.slice(iSeparator + 1).trim();
    }
  }

  return headers;
}

export function parseTextFrame(data: string) {
  const iSeparator = data.indexOf(HEADER_BODY_SEPARATOR);
  const hasBody = iSeparator >= 0;
  const headers = parseHeaders(hasBody ? data.slice(0, iSeparator) : data);
  return {
    path: headers[Header.PATH] ?? "",
    headers,
    body: hasBody ? data.slice(iSeparator + HEADER_BODY_SEPARATOR.length) : ""
  };
}

export function parseBinaryFrame(buffer: ArrayBuffer) {
  const headerLength = new DataView(buffer).getUint16(0);
  const header = new TextDecoder().decode(new Uint8Array(buffer, BINARY_HEADER_LENGTH_BYTES, headerLength));
  return {
    path: parseHeaders(header)[Header.PATH] ?? "",
    audio: new Uint8Array(buffer, BINARY_HEADER_LENGTH_BYTES + headerLength)
  };
}

export function parseWordBoundaries(body: string) {
  const envelope = metadataSchema.safeParse(JSON.parse(body));
  if (!envelope.success) {
    return [];
  }

  const boundaries: WordBoundary[] = [];
  for (const { Type: type, Data: data } of envelope.data.Metadata) {
    if (type !== WORD_BOUNDARY_TYPE) {
      continue;
    }

    const word = wordBoundaryDataSchema.safeParse(data);
    if (!word.success) {
      continue;
    }

    boundaries.push({
      time: word.data.Offset / TICKS_PER_SECOND,
      duration: word.data.Duration / TICKS_PER_SECOND,
      text: unescapeXml(word.data.text.Text)
    });
  }

  return boundaries;
}
