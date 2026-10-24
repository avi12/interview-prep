import { MIC_PROCESSOR_NAME } from "./defaults.ts";

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void;

const CHUNK_SECONDS = 0.04;

class MicProcessor extends AudioWorkletProcessor {
  private readonly chunk = new Float32Array(Math.round(sampleRate * CHUNK_SECONDS));
  private filled = 0;

  process(inputs: Float32Array[][]) {
    const channel = inputs[0]?.[0];
    if (!channel) {
      return true;
    }

    for (const sample of channel) {
      this.chunk[this.filled++] = sample;

      if (this.filled === this.chunk.length) {
        this.port.postMessage(this.chunk.slice());
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor(MIC_PROCESSOR_NAME, MicProcessor);
