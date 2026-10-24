import { SPEAKER_SAMPLE_RATE } from "./defaults.ts";
import { pcm16ToFloat } from "./pcm.ts";

const MONO = 1;
const FIRST_CHANNEL = 0;
const START_LEAD_SECONDS = 0.05;
const SUSPENDED_STATE = "suspended";

export function createPlayback(onBlocked: (isBlocked: boolean) => void) {
  const context = new AudioContext({ sampleRate: SPEAKER_SAMPLE_RATE });
  const playing = new Set<AudioBufferSourceNode>();
  let nextStartSeconds = 0;
  function reportBlocked() {
    onBlocked(context.state === SUSPENDED_STATE);
  }

  context.addEventListener("statechange", reportBlocked);
  reportBlocked();

  function flush() {
    for (const source of playing) {
      source.stop();
    }
    playing.clear();
    nextStartSeconds = 0;
  }

  return {
    resume() {
      void context.resume();
    },
    play(bytes: Uint8Array) {
      const samples = pcm16ToFloat(bytes);
      if (samples.length === 0) {
        return;
      }

      const buffer = context.createBuffer(MONO, samples.length, SPEAKER_SAMPLE_RATE);
      buffer.copyToChannel(samples, FIRST_CHANNEL);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      const startSeconds = Math.max(nextStartSeconds, context.currentTime + START_LEAD_SECONDS);
      source.start(startSeconds);
      nextStartSeconds = startSeconds + buffer.duration;
      playing.add(source);
      source.addEventListener("ended", () => playing.delete(source));
    },
    flush,
    close() {
      flush();
      void context.close();
    }
  };
}
