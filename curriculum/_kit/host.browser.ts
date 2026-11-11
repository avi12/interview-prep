import { KIT_BRIDGE_KEY, type KitHost } from "#kit/host-contract.ts";

function isKitHost(value: unknown): value is KitHost {
  return typeof value === "object" && value !== null;
}

function bridge() {
  const found: unknown = Object.getOwnPropertyDescriptor(globalThis, KIT_BRIDGE_KEY)?.value;
  if (!isKitHost(found)) {
    throw new Error("The browser test runner did not install its kit bridge");
  }

  return found;
}

export const kitHost = {
  defaultImplDir: lessonId => bridge().defaultImplDir(lessonId),
  importModule: path => bridge().importModule(path),
  isFile: path => bridge().isFile(path),
  readText: path => bridge().readText(path),
  appendRecord: input => bridge().appendRecord(input),
  runSuitesWithSubjects: runs => bridge().runSuitesWithSubjects(runs)
} satisfies KitHost;
