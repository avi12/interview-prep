import { describe, expect, it } from "vitest";
import { bridgeReportSchema } from "./bridge-report.ts";
import { BridgeFailure, BridgeUp, GlicState } from "./bridge-vocab.ts";

describe("bridgeReportSchema", () => {
  it("accepts every report the bridge sends", () => {
    const reports = [
      { kind: BridgeUp.BOOTED },
      { kind: BridgeUp.READY },
      { kind: BridgeUp.STATE, state: GlicState.LISTENING },
      { kind: BridgeUp.ERROR, failure: BridgeFailure.LIVE_BROKE }
    ];
    for (const report of reports) expect(bridgeReportSchema.safeParse(report).success).toBe(true);
  });

  it("refuses what a page script could forge", () => {
    const forged = [
      { kind: "run", code: "alert(1)" },
      { kind: BridgeUp.STATE, state: "dancing" },
      { kind: BridgeUp.ERROR, failure: "anything I like" },
      { kind: BridgeUp.ERROR },
      "booted",
      null
    ];
    for (const report of forged) expect(bridgeReportSchema.safeParse(report).success).toBe(false);
  });
});
