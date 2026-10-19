import { BridgeFailure, BridgeUp, GlicState } from "./bridge-vocab.ts";
import { z } from "./zod.ts";

export const bridgeReportSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(BridgeUp.BOOTED) }),
  z.object({ kind: z.literal(BridgeUp.READY) }),
  z.object({ kind: z.literal(BridgeUp.STATE), state: z.enum(GlicState) }),
  z.object({ kind: z.literal(BridgeUp.ERROR), failure: z.enum(BridgeFailure) })
]);

export type BridgeReport = z.infer<typeof bridgeReportSchema>;
