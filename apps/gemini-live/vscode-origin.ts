import { serverOrigin } from "../../scripts/lib/server.ts";

export function resolveVscodeOrigin() {
  return process.env.VSCODE_ORIGIN ?? serverOrigin();
}
