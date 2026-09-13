import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tests run against a real SQLite file (test.db), not mocks.
 *
 * The value of this suite is that it exercises the actual business rules -
 * stage transitions, progress recalculation, transactional conversion - and a
 * mocked Prisma client would verify none of that. SQLite makes a throwaway
 * database cheap enough that there is no reason to fake it.
 */
export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    // One worker: every test shares the single SQLite file and truncates it
    // between cases, so parallel files would fight over the same rows.
    pool: "threads",
    maxWorkers: 1,
    minWorkers: 1,
    fileParallelism: false,
    env: {
      DATABASE_URL: "file:./test.db",
      AUTH_SECRET: "test-secret-value-not-used-in-production-0123456789",
      NODE_ENV: "test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
});
