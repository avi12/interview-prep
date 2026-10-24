import { z } from "./zod.ts";

export const Engine = {
  SUBSCRIPTION: "subscription",
  API_KEY: "apiKey"
} as const;
export type Engine = (typeof Engine)[keyof typeof Engine];

export const DEFAULT_ENGINE = Engine.SUBSCRIPTION;

export const engineSchema = z.enum(Engine);

export const ENGINE_LABEL: Record<Engine, string> = {
  [Engine.SUBSCRIPTION]: "Your Gemini subscription",
  [Engine.API_KEY]: "Your API key"
};

export const ENGINE_DETAIL: Record<Engine, string> = {
  [Engine.SUBSCRIPTION]: "Rides your Google account through Google's own Gemini web client and this extension. Unofficial: Google may suspend an account that uses it.",
  [Engine.API_KEY]: "The official, public Gemini Live API, billed to your key. The free tier works, with lower rate limits."
};
