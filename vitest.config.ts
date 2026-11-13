import { defineConfig } from "vitest/config";

const TEST_TIMEOUT_MS = 30_000;
const HOOK_TIMEOUT_MS = 60_000;

export default defineConfig({
  test: {
    include: ["curriculum/**/tests/*.test.ts"],
    testTimeout: TEST_TIMEOUT_MS,
    hookTimeout: HOOK_TIMEOUT_MS,
    environment: "node",
    setupFiles: ["curriculum/_kit/test-cases.setup.ts"]
  }
});
