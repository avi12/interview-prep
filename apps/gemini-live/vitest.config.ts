import { defineConfig } from "vitest/config";

import { SCRIPTS_ALIAS, SOURCE_ALIAS } from "./aliases.ts";

export default defineConfig({
  resolve: {
    alias: {
      ...SCRIPTS_ALIAS,
      ...SOURCE_ALIAS
    }
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
