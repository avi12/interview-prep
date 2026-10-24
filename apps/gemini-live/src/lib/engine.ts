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

export const SUBSCRIPTION_RISK = "The extension rides your Gemini subscription through Google's own web client, which Google doesn't offer for this use.";
export const SUBSCRIPTION_CONSEQUENCE = "Google may suspend or ban an account that uses it.";

export const ENGINE_DETAIL: Record<Engine, string> = {
  [Engine.SUBSCRIPTION]: `${SUBSCRIPTION_RISK} ${SUBSCRIPTION_CONSEQUENCE}`,
  [Engine.API_KEY]: "The official, public Gemini Live API, billed to your key. The free tier works, with lower rate limits."
};
