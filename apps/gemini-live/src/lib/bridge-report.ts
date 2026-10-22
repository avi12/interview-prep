import { BridgeFailure, GlicState } from "./bridge-vocab.ts";
import { z } from "./zod.ts";

export const glicStateSchema = z.enum(GlicState);

export const bridgeFailureSchema = z.enum(BridgeFailure);
