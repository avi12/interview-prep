import type { Language } from "./language.ts";

export const PromptEvent = {
  TEST_FAILED: "test-failed",
  TEST_PASSED: "test-passed"
} as const;
export type PromptEvent = (typeof PromptEvent)[keyof typeof PromptEvent];

const PROMPT_DIR = "prompts";

export const PROMPT_CLIP_GLOB = `${PROMPT_DIR}/*.mp3`;

export const promptClipPath = ({ event, language }: { event: PromptEvent; language: Language }) => `/${PROMPT_DIR}/${event}-${language}.mp3` as const;
