import { TutorBlockKind, type TutorView } from "@scripts/lib/tutor-view.ts";
import { z } from "./zod.ts";

const TUTOR_VIEW_URL = String(import.meta.env.WXT_TUTOR_VIEW_URL);
const FETCH_TIMEOUT_MS = 800;

export const tutorViewSchema: z.ZodType<TutorView> = z.object({
  version: z.string(),
  title: z.string(),
  blocks: z.array(z.object({ kind: z.enum(TutorBlockKind), text: z.string() })),
  testRun: z.object({ at: z.string(), isPass: z.boolean() }).nullable()
});

export const fetchTutorView = async () => {
  const response = await fetch(TUTOR_VIEW_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!response?.ok) return null;
  const parsed = tutorViewSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
};
