import type { StartResult } from "./extension-channel.ts";
import type { VscodeTab } from "./live-window.ts";
import type { Session } from "./session-schema.ts";

export interface LiveEngine {
  open(vscodeTab: VscodeTab): Promise<StartResult>;
  stop(session: Session): Promise<unknown>;
  toggleMic(session: Session): Promise<unknown>;
  retitle(session: Session): Promise<unknown>;
}
