export const GLIC_URL = "https://gemini.google.com/glic";

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

export const GlicCommand = {
  START_LIVE: "glicStartLive",
  STOP_LIVE: "glicStopLive",
  BEGIN_TEXT: "glicBeginText",
  SUBMIT: "glicSubmit",
  SET_MIC: "glicSetMic"
} as const;
export type GlicCommand = (typeof GlicCommand)[keyof typeof GlicCommand];

export interface GlicCommandMap {
  [GlicCommand.START_LIVE](): boolean;
  [GlicCommand.STOP_LIVE](): boolean;
  [GlicCommand.BEGIN_TEXT](): boolean;
  [GlicCommand.SUBMIT](): boolean;
  [GlicCommand.SET_MIC](data: boolean): void;
}

export const GlicReport = {
  BOOTED: "glicBooted",
  READY: "glicReady",
  STATE: "glicState",
  FAILED: "glicFailed"
} as const;
type GlicReport = (typeof GlicReport)[keyof typeof GlicReport];

export interface GlicReportMap {
  [GlicReport.BOOTED](): void;
  [GlicReport.READY](): void;
  [GlicReport.STATE](data: GlicState): void;
  [GlicReport.FAILED](data: BridgeFailure): void;
}

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
