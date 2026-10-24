import { z } from "./zod.ts";
import { TutorBlockKind, type TutorView } from "@scripts/lib/tutor-view.ts";

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

export async function requestTutorView(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = tutorViewSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}
