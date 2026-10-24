import { captureVscode } from "./capture.ts";
import type { Session } from "./session-schema.ts";
import { updateSession } from "./session.ts";

export async function captureForSession(session: Session) {
  const { sight, frame } = await captureVscode(session.vscodeTab);
  await updateSession({
    sight,
    frames: session.frames + (frame ? 1 : 0)
  });
  return frame;
}
