import { Engine } from "./engine.ts";
import { LiveState, Sight } from "./live-state.ts";
import { freshSession, isEngineTab, parseSession } from "./session-schema.ts";
import { describe, expect, it } from "vitest";

const VSCODE_TAB = 1;
const LIVE_TAB = 2;
const LIVE_WINDOW = 3;
const OTHER_TAB = 9;

const voiceSession = freshSession({
  engine: Engine.API_KEY,
  vscodeTab: VSCODE_TAB,
  liveTab: LIVE_TAB,
  liveWindow: LIVE_WINDOW,
  title: "Two Sum",
  brief: ""
});

describe("parseSession", () => {
  it("reads a session it wrote", () => {
    expect(parseSession(voiceSession)).toEqual(voiceSession);
  });

  it("reads a session saved before engines as a subscription session", () => {
    const { engine: _engine, liveTab: _liveTab, liveWindow: _liveWindow, ...shared } = voiceSession;
    expect(
      parseSession({
        ...shared,
        glicTab: LIVE_TAB,
        glicWindow: LIVE_WINDOW
      })
    ).toEqual({
      ...voiceSession,
      engine: Engine.SUBSCRIPTION
    });
  });

  it("drops anything else", () => {
    expect(parseSession({ vscodeTab: VSCODE_TAB })).toBeNull();
    expect(parseSession(null)).toBeNull();
  });
});

describe("freshSession", () => {
  it("starts opening, muted and blind, with the brief kept for reloads", () => {
    const session = freshSession({
      engine: Engine.SUBSCRIPTION,
      vscodeTab: VSCODE_TAB,
      liveTab: LIVE_TAB,
      liveWindow: LIVE_WINDOW,
      title: "",
      brief: "be kind"
    });
    expect(session).toMatchObject({
      state: LiveState.OPENING,
      sight: Sight.UNKNOWN,
      isMicOpen: false,
      frames: 0,
      brief: "be kind",
      briefing: "be kind"
    });
  });
});

describe("isEngineTab", () => {
  it("routes a tab's messages only to the engine whose page it carries", () => {
    expect(
      isEngineTab({
        session: voiceSession,
        engine: Engine.API_KEY,
        tabId: LIVE_TAB
      })
    ).toBe(true);
    expect(
      isEngineTab({
        session: voiceSession,
        engine: Engine.SUBSCRIPTION,
        tabId: LIVE_TAB
      })
    ).toBe(false);
    expect(
      isEngineTab({
        session: voiceSession,
        engine: Engine.API_KEY,
        tabId: OTHER_TAB
      })
    ).toBe(false);
    expect(
      isEngineTab({
        session: null,
        engine: Engine.API_KEY,
        tabId: LIVE_TAB
      })
    ).toBe(false);
    expect(
      isEngineTab({
        session: voiceSession,
        engine: Engine.API_KEY,
        tabId: undefined
      })
    ).toBe(false);
  });
});
