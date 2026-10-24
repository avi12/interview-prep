import { DEFAULT_ENGINE, Engine } from "./engine.ts";
import { parseEngine } from "./settings.ts";
import { describe, expect, it, vi } from "vitest";

vi.mock("#imports", () => ({
  storage: {
    defineItem: () => ({})
  }
}));

describe("parseEngine", () => {
  it("keeps a known engine", () => {
    expect(parseEngine(Engine.API_KEY)).toBe(Engine.API_KEY);
  });

  it("falls back to the default for anything else", () => {
    expect(parseEngine("gpt")).toBe(DEFAULT_ENGINE);
    expect(parseEngine(undefined)).toBe(DEFAULT_ENGINE);
  });
});
