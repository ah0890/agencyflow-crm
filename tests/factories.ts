import { prisma } from "@/lib/db";

/**
 * Minimal builders so each test states only what it cares about.
 * Everything else gets a sensible default.
 */

let counter = 0;
const unique = () => `${Date.now()}-${++counter}`;

export async function makeUser(overrides: Partial<{ name: string; email: string; role: string }> = {}) {
  return prisma.user.create({
    data: {
      name: overrides.name ?? "Test User",
      email: overrides.email ?? `user-${unique()}@agencyflow.test`,
      role: overrides.role ?? "SALES",
      passwordHash: "not-a-real-hash",
    },
  });
}

export async function makeClient(accountManagerId: string, overrides: Partial<{ name: string; status: string }> = {}) {
  return prisma.client.create({
    data: {
      name: overrides.name ?? `Client ${unique()}`,
      contactName: "Primary Contact",
      email: `client-${unique()}@example.test`,
      status: overrides.status ?? "ACTIVE",
      accountManagerId,
    },
  });
}
