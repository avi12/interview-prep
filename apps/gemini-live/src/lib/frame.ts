import { zod } from "./zod.ts";

export const frameSchema = zod.object({
  base64: zod.string(),
  mimeType: zod.string(),
  width: zod.number(),
  height: zod.number()
});
export type Frame = zod.infer<typeof frameSchema>;
