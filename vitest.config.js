import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    environment: "node",
    globals: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/calc/**/*.js", "src/data/**/*.js", "src/docs/**/*.js"],
      exclude: ["src/lib/**", "src/ui/**"],
      thresholds: {
        lines: 90,
        branches: 85,
        functions: 90,
        statements: 90,
      },
    },
  },
});
