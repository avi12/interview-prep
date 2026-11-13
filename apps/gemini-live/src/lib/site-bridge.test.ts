import { describe, expect, it } from "vitest";

import { Engine } from "./engine.ts";
import { LiveState } from "./live-state.ts";
import { freshSession } from "./session-schema.ts";
import { startResultSchema, voiceStatusOfSession, voiceStatusOrNoneSchema } from "./site-bridge.ts";

const SESSION = freshSession({
  engine: Engine.SUBSCRIPTION,
  vscodeTab: 1,
  title: "Lesson",
  liveTab: 2,
  liveWindow: 3,
  brief: "brief"
});

describe("voiceStatusOfSession", () => {
  it("is nothing while no session runs", () => {
    expect(voiceStatusOfSession(null)).toBeNull();
  });

  it("keeps only what the page may see", () => {
    expect(voiceStatusOfSession(SESSION)).toEqual({
      engine: Engine.SUBSCRIPTION,
      state: LiveState.OPENING,
      detail: "",
      isMicOpen: true
    });
  });
});

describe("incoming status", () => {
  it("accepts a status or none", () => {
    expect(voiceStatusOrNoneSchema.safeParse(null).success).toBe(true);
    expect(voiceStatusOrNoneSchema.safeParse(voiceStatusOfSession(SESSION)).success).toBe(true);
  });

  it("rejects an unknown state, a missing field and a wrong type", () => {
    expect(
      voiceStatusOrNoneSchema.safeParse({
        engine: Engine.API_KEY,
        state: "dancing",
        detail: "",
        isMicOpen: true
      }).success
    ).toBe(false);
    expect(voiceStatusOrNoneSchema.safeParse({ engine: Engine.API_KEY }).success).toBe(false);
    expect(voiceStatusOrNoneSchema.safeParse("live").success).toBe(false);
  });

  it("checks a start result", () => {
    expect(
      startResultSchema.safeParse({
        isStarted: true,
        detail: ""
      }).success
    ).toBe(true);
    expect(startResultSchema.safeParse({ isStarted: "yes" }).success).toBe(false);
  });
});
