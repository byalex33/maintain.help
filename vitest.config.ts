import { defineConfig } from "vitest/config";

import path from "node:path";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
