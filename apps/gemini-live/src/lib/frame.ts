import { z } from "./zod.ts";

export const frameSchema = z.object({
  base64: z.string(),
  mimeType: z.string(),
  width: z.number(),
  height: z.number()
});
export type Frame = z.infer<typeof frameSchema>;
