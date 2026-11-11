import baseConfig from "./vitest.config.ts";
import { defineConfig } from "vitest/config";

const HARNESS_TIMEOUT_MS = 60 * 60 * 1000;

export default defineConfig({
  ...baseConfig,
  test: {
    include: ["browser-runner.e2e.ts"],
    environment: "node",
    testTimeout: HARNESS_TIMEOUT_MS
  }
});
