import { z } from "./zod.ts";
import { TutorBlockKind, type TutorView } from "@scripts/lib/tutor-view.ts";

const TUTOR_VIEW_URL = String(import.meta.env.WXT_TUTOR_VIEW_URL);
const FETCH_TIMEOUT_MS = 800;

const tutorViewSchema: z.ZodType<TutorView> = z.object({
  version: z.string(),
  title: z.string(),
  blocks: z.array(
    z.object({
      kind: z.enum(TutorBlockKind),
      text: z.string()
    })
  ),
  testRun: z.object({
    ranAt: z.string(),
    isPass: z.boolean()
  }).nullable()
});

export async function fetchTutorView() {
  const response = await fetch(TUTOR_VIEW_URL, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = tutorViewSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}
