import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

function fromHere(path: string) {
  return fileURLToPath(new URL(path, import.meta.url));
}

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@server\/(.*)$/,
        replacement: `${fromHere("./server/")}$1`
      },
      {
        find: /^@\/(.*)$/,
        replacement: `${fromHere("./src/")}$1`
      },
      {
        find: /^#scripts\/(.*)$/,
        replacement: `${fromHere("../../scripts/")}$1`
      },
      {
        find: /^#kit\/(.*)$/,
        replacement: `${fromHere("../../curriculum/_kit/")}$1`
      }
    ]
  },
  test: {
    include: ["server/**/*.test.ts", "src/**/*.test.ts"],
    environment: "node"
  }
});
