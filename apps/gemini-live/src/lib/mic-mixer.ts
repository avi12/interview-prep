const QUIET_RMS = 0.012;
const SAMPLE_SIZE = 1024;
const COMFORT_NOISE_LEVEL = 0.001;
const GATE_RAMP_SECONDS = 0.01;

export interface MicMixer {
  stream: MediaStream;
  isQuiet: () => boolean;
  setOpen: (isOpen: boolean) => void;
  play: (audio: ArrayBuffer) => Promise<void>;
}

const rms = (samples: Float32Array) => {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
};

const comfortNoise = (context: AudioContext) => {
  const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) samples[index] = (Math.random() * 2 - 1) * COMFORT_NOISE_LEVEL;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  noise.start();
  return noise;
};

export const mixMicrophone = (microphone: MediaStream): MicMixer => {
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const source = context.createMediaStreamSource(microphone);
  const gate = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = SAMPLE_SIZE;
  source.connect(gate).connect(destination);
  source.connect(analyser);
  comfortNoise(context).connect(destination);
  void context.resume();

  const [mixedTrack] = destination.stream.getAudioTracks();
  if (mixedTrack) {
    const stopMixed = mixedTrack.stop.bind(mixedTrack);
    mixedTrack.stop = () => {
      stopMixed();
      for (const track of microphone.getTracks()) track.stop();
      void context.close();
    };
  }

  let isOpen = true;
  const setOpen = (next: boolean) => {
    isOpen = next;
    gate.gain.setTargetAtTime(isOpen ? 1 : 0, context.currentTime, GATE_RAMP_SECONDS);
  };

  const samples = new Float32Array(SAMPLE_SIZE);
  const isQuiet = () => {
    if (!isOpen) return true;
    analyser.getFloatTimeDomainData(samples);
    return rms(samples) < QUIET_RMS;
  };

  const play = async (audio: ArrayBuffer) => {
    const clip = context.createBufferSource();
    clip.buffer = await context.decodeAudioData(audio);
    clip.connect(destination);
    await new Promise<void>(resolve => {
      clip.onended = () => resolve();
      clip.start();
    });
  };

  return { stream: destination.stream, isQuiet, setOpen, play };
};
