import { MIC_PROCESSOR_NAME, MIC_SAMPLE_RATE } from "./defaults.ts";
import workletUrl from "./mic-worklet.ts?worker&url";
import { downsample, floatToPcm16 } from "./pcm.ts";
import { z } from "@/lib/zod.ts";

const chunkSchema = z.instanceof(Float32Array);

const MIC_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

export async function openMic(onChunk: (pcm: Int16Array) => void) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  const context = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
  await context.audioWorklet.addModule(workletUrl);
  const source = context.createMediaStreamSource(stream);
  const processor = new AudioWorkletNode(context, MIC_PROCESSOR_NAME);
  processor.port.addEventListener("message", e => {
    const parsed = chunkSchema.safeParse(e.data);
    if (!parsed.success) {
      return;
    }

    onChunk(
      floatToPcm16(
        downsample({
          samples: parsed.data,
          fromRate: context.sampleRate,
          toRate: MIC_SAMPLE_RATE
        })
      )
    );
  });
  processor.port.start();
  source.connect(processor);
  processor.connect(context.destination);
  await context.resume();

  return {
    close() {
      source.disconnect();
      processor.disconnect();
      for (const track of stream.getTracks()) {
        track.stop();
      }
      void context.close();
    }
  };
}
