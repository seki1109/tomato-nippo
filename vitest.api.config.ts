import path from "path";

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

const env = loadEnv("test", process.cwd(), "");

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/api/**/*.test.ts"],
    env,
    // テストファイルを直列実行してDB競合を防ぐ
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
