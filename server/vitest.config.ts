import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Restrict to source: `npm run build` compiles *.test.ts into dist/,
    // and vitest's default glob would otherwise run those stale copies too.
    include: ["src/**/*.test.ts"],
  },
});
