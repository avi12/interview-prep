import { bridgeFailureSchema, glicStateSchema } from "./bridge-report.ts";
import { BridgeFailure, GlicState } from "./bridge-vocab.ts";
import { describe, expect, it } from "vitest";

describe("bridge report payloads", () => {
  it("accepts every state and failure the bridge reports", () => {
    for (const state of Object.values(GlicState)) {
      expect(glicStateSchema.safeParse(state).success).toBe(true);
    }
    for (const failure of Object.values(BridgeFailure)) {
      expect(bridgeFailureSchema.safeParse(failure).success).toBe(true);
    }
  });

  it("refuses what a page script could forge", () => {
    for (const forged of ["dancing", "anything I like", {
      kind: "run",
      code: "alert(1)"
    }, null]) {
      expect(glicStateSchema.safeParse(forged).success).toBe(false);
      expect(bridgeFailureSchema.safeParse(forged).success).toBe(false);
    }
  });
});
