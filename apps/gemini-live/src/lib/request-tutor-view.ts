import { tutorViewSchema } from "@scripts/lib/tutor-view.ts";

const FETCH_TIMEOUT_MS = 800;

export async function requestTutorView(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const parsed = tutorViewSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? parsed.data : null;
}
