import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["curriculum/**/tests/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    environment: "node",
    setupFiles: ["curriculum/_kit/test-cases.setup.ts"]
  }
});
