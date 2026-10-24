import { SCRIPTS_ALIAS, SOURCE_ALIAS } from "./aliases.ts";
import { defineConfig } from "vitest/config";

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
