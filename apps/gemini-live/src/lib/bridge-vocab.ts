export const GLIC_URL = "https://gemini.google.com/glic";

export const BridgeUp = {
  BOOTED: "booted",
  READY: "ready",
  STATE: "state",
  ERROR: "error"
} as const;
export type BridgeUp = (typeof BridgeUp)[keyof typeof BridgeUp];

export const BridgeCall = {
  START: "start",
  STOP: "stop",
  BEGIN_TEXT: "beginText",
  SUBMIT: "submitAndRead"
} as const;
export type BridgeCall = (typeof BridgeCall)[keyof typeof BridgeCall];

export const GlicState = {
  IDLE: "idle",
  LISTENING: "listening",
  RESUMING: "resuming"
} as const;
export type GlicState = (typeof GlicState)[keyof typeof GlicState];

export const BridgeFailure = {
  SIGNED_OUT: "signed-out",
  UNAVAILABLE: "unavailable",
  LIVE_BROKE: "live-broke",
  PAGE_DID_NOT_START: "page-did-not-start",
  LIVE_DID_NOT_START: "live-did-not-start"
} as const;
export type BridgeFailure = (typeof BridgeFailure)[keyof typeof BridgeFailure];

export interface Activation {
  title: string;
  url: string;
}

export interface Frame {
  base64: string;
  mimeType: string;
  width: number;
  height: number;
}
