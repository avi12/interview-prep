import { sendJson } from "@/server/respond.ts";
import type { Route } from "@/server/router.ts";
import {
  EXTENSION_BUILD_COMMAND,
  EXTENSION_BUILD_RELATIVE_DIR,
  VOICE_SETUP_PATH,
  type VoiceSetup
} from "@scripts/lib/voice.ts";
import { resolve } from "node:path";

export function voiceSetupRoute(root: string): Route {
  const setup: VoiceSetup = {
    extensionPath: resolve(root, EXTENSION_BUILD_RELATIVE_DIR),
    buildCommand: EXTENSION_BUILD_COMMAND
  };
  const body = JSON.stringify(setup);
  return {
    isMatch: pathname => pathname === VOICE_SETUP_PATH,
    isGuarded: true,
    handle: ({ response }) => sendJson({
      response,
      body
    })
  };
}
