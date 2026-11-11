import { SOURCE_ALIASES } from "./src/aliases.mts";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      ...SOURCE_ALIASES,
      vscode: fileURLToPath(new URL("src/test/vscodeFake.ts", import.meta.url))
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
