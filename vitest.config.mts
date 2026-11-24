import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
    coverage: {
      provider: "v8",
      include: ["lib/server/**/*.ts", "app/api/**/*.ts"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 80 },
    },
  },
});
