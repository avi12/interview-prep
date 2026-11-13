import { BridgeFailure, GlicState } from "./bridge-vocab.ts";
import { zod } from "./zod.ts";

export const glicStateSchema = zod.enum(GlicState);

export const bridgeFailureSchema = zod.enum(BridgeFailure);
