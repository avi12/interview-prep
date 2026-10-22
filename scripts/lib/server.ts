import { TUTOR_VIEW_PATH } from "./tutor-view.ts";

export const SERVER_HOST = "127.0.0.1";
export const SERVER_DEFAULT_PORT = 8765;
export const TUTOR_VIEW_PORT = 8766;

export const serverOrigin = (port: number = SERVER_DEFAULT_PORT) => `http://${SERVER_HOST}:${port}`;

export const tutorViewUrl = () => `${serverOrigin(TUTOR_VIEW_PORT)}${TUTOR_VIEW_PATH}`;
