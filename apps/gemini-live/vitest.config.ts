import { defineConfig } from "vitest/config";
import { SCRIPTS_ALIAS } from "./aliases.ts";

export default defineConfig({
  resolve: { alias: SCRIPTS_ALIAS },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node"
  }
});
