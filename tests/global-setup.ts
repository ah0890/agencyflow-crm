import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

/**
 * Creates a fresh test database once before the suite runs.
 *
 * `prisma db push` applies the schema directly, which is faster than running
 * migrations and is exactly what a disposable test database wants.
 */
export default function globalSetup() {
  rmSync("test.db", { force: true });

  // --url overrides the datasource from prisma.config.ts, so the test run can
  // never touch the development database. The file was just deleted, so this
  // is always a create and never needs --accept-data-loss.
  execSync("npx prisma db push --url file:./test.db", { stdio: "ignore" });

  return () => {
    // Best effort: on Windows the SQLite handle can still be open as the
    // process exits. The next run deletes it before creating the schema
    // anyway, so a failure here is harmless.
    try {
      rmSync("test.db", { force: true });
    } catch {
      // ignore
    }
  };
}
