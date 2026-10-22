const QUIET_RMS = 0.012;
const SAMPLE_SIZE = 1024;

export interface MicMixer {
  stream: MediaStream;
  isQuiet: () => boolean;
  play: (audio: ArrayBuffer) => Promise<void>;
}

const rms = (samples: Float32Array) => {
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length);
};

export const mixMicrophone = (microphone: MediaStream): MicMixer => {
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const source = context.createMediaStreamSource(microphone);
  const analyser = context.createAnalyser();
  analyser.fftSize = SAMPLE_SIZE;
  source.connect(destination);
  source.connect(analyser);
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

  const samples = new Float32Array(SAMPLE_SIZE);
  const isQuiet = () => {
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

  return { stream: destination.stream, isQuiet, play };
};
