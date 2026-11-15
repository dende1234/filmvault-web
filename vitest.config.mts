import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Helpers, server/UI regressions and isolated PostgreSQL tests; no live database.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: { include: ["lib/**/*.test.{ts,tsx}"], environment: "node" },
});
