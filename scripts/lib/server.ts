import { TUTOR_VIEW_PATH } from "./tutor-view.ts";
import { VOICE_PATH } from "./voice.ts";

export const SERVER_HOST = "127.0.0.1";
export const SERVER_DEFAULT_PORT = 8765;
export const TUTOR_VIEW_PORT = 8766;

export function serverOrigin(port: number = SERVER_DEFAULT_PORT) {
  return `http://${SERVER_HOST}:${port}`;
}

export function tutorViewUrl() {
  return `${serverOrigin(TUTOR_VIEW_PORT)}${TUTOR_VIEW_PATH}`;
}

export function voiceUrl() {
  return `${serverOrigin(TUTOR_VIEW_PORT)}${VOICE_PATH}`;
}
