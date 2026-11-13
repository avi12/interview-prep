import { decodeFrames, FrameKind, type NarrationMeta, type NarrationWord } from "#scripts/lib/narration-stream.ts";

const AUDIO_MIME = "audio/mpeg";
const SOURCE_OPEN_EVENT = "sourceopen";
const UPDATE_END_EVENT = "updateend";

function isStreamable() {
  return typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(AUDIO_MIME);
}

function opened(mediaSource: MediaSource) {
  return new Promise<SourceBuffer>(resolve => {
    mediaSource.addEventListener(SOURCE_OPEN_EVENT, () => resolve(mediaSource.addSourceBuffer(AUDIO_MIME)), {
      once: true
    });
  });
}

function appended({ sourceBuffer, bytes }: { sourceBuffer: SourceBuffer; bytes: Uint8Array<ArrayBuffer> }) {
  return new Promise<void>(resolve => {
    sourceBuffer.addEventListener(UPDATE_END_EVENT, () => resolve(), { once: true });
    sourceBuffer.appendBuffer(bytes);
  });
}

async function readFrames({
  response,
  onMeta,
  onWord,
  sink
}: {
  response: Response;
  onMeta: (meta: NarrationMeta) => void;
  onWord: (word: NarrationWord) => void;
  sink: {
    append: (bytes: Uint8Array<ArrayBuffer>) => Promise<void>;
    end: () => void;
  };
}) {
  if (response.body === null) {
    throw new Error("The narration response has no body");
  }

  for await (const frame of decodeFrames(response.body)) {
    if (frame.kind === FrameKind.META) {
      onMeta(frame);
    } else if (frame.kind === FrameKind.WORD) {
      onWord(frame);
    } else {
      await sink.append(new Uint8Array(frame.bytes));
    }
  }

  sink.end();
}

export function streamNarration({ url, signal }: { url: URL; signal: AbortSignal }) {
  const audio = new Audio();
  const words: NarrationWord[] = [];
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  const { promise: metaReady, resolve: resolveMeta } = Promise.withResolvers<NarrationMeta>();
  const mediaSource = isStreamable() ? new MediaSource() : null;
  const objectUrl = mediaSource === null ? null : URL.createObjectURL(mediaSource);
  if (objectUrl !== null) {
    audio.src = objectUrl;
  }

  const sourceBuffer = mediaSource === null ? null : opened(mediaSource);

  const sink = {
    async append(bytes: Uint8Array<ArrayBuffer>) {
      if (sourceBuffer === null) {
        chunks.push(bytes);
        return;
      }

      await appended({
        sourceBuffer: await sourceBuffer,
        bytes
      });
    },
    end() {
      if (mediaSource !== null) {
        mediaSource.endOfStream();
        return;
      }

      audio.src = URL.createObjectURL(new Blob(chunks, { type: AUDIO_MIME }));
      void audio.play().catch(() => undefined);
    }
  };

  const finished = fetch(url, { signal }).then(response => {
    if (!response.ok) {
      throw new Error(`Narration failed with status ${response.status}`);
    }

    return readFrames({
      response,
      onMeta: resolveMeta,
      onWord: word => words.push(word),
      sink
    });
  });

  return {
    audio,
    words,
    metaReady,
    finished,
    stop() {
      audio.pause();

      if (objectUrl !== null) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };
}
