import { resolveApiKey } from "@/apiKey.ts";
import { ApiKeySource } from "@scripts/lib/voice.ts";
import { describe, expect, it } from "vitest";

describe("resolveApiKey", () => {
  it("prefers the environment variable", () => {
    expect(
      resolveApiKey({
        envKey: " env-key ",
        savedKey: "saved-key"
      })
    ).toEqual({
      key: "env-key",
      source: ApiKeySource.ENV
    });
  });

  it("falls back to the saved key", () => {
    expect(
      resolveApiKey({
        envKey: "  ",
        savedKey: "saved-key"
      })
    ).toEqual({
      key: "saved-key",
      source: ApiKeySource.SAVED
    });
  });

  it("reports no key", () => {
    expect(
      resolveApiKey({
        envKey: undefined,
        savedKey: undefined
      })
    ).toEqual({
      key: "",
      source: ApiKeySource.NONE
    });
  });
});
