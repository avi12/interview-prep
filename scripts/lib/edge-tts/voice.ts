import { zod } from "#scripts/lib/zod.ts";

const voiceSchema = zod.object({
  ShortName: zod.string(),
  FriendlyName: zod.string(),
  Locale: zod.string(),
  LocaleName: zod.string(),
  Gender: zod.string()
});

export const voicesSchema = zod.array(voiceSchema);

export type Voice = zod.infer<typeof voiceSchema>;
