import { SCRIPTS_ALIAS } from "./aliases.ts";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: SCRIPTS_ALIAS
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
