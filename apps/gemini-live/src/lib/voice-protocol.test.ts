import { LiveState } from "./live-state.ts";
import { voiceReportSchema } from "./voice-protocol.ts";
import { describe, expect, it } from "vitest";

describe("voiceReportSchema", () => {
  it("accepts a report from the voice page", () => {
    const report = {
      state: LiveState.FAILED,
      detail: "Add your API key",
      isMicOpen: false
    };
    expect(voiceReportSchema.safeParse(report).data).toEqual(report);
  });

  it("rejects an unknown state", () => {
    expect(
      voiceReportSchema.safeParse({
        state: "dancing",
        detail: "",
        isMicOpen: true
      }).success
    ).toBe(false);
  });
});
