export const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

export const VOICES_URL = "https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list";
export const VOICES_TOKEN_PARAMETER = "trustedclienttoken";
export const SYNTHESIZE_URL = "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1";

const EDGE_VERSION = "155.0.4283.45";
const EDGE_MAJOR_VERSION = EDGE_VERSION.split(".")[0];
export const SEC_MS_GEC_VERSION = `1-${EDGE_VERSION}`;
export const EDGE_USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${EDGE_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${EDGE_MAJOR_VERSION}.0.0.0`;

export const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";
export const AUDIO_MIME_TYPE = "audio/mpeg";
export const TICKS_PER_SECOND = 10_000_000;
export const DEFAULT_VOICE = "en-US-AriaNeural";
