import { beforeEach } from "vitest";
import { prisma } from "@/lib/db";

/**
 * Empty every table before each test.
 *
 * Deleting in child-to-parent order avoids foreign-key failures, and starting
 * from zero means no test can depend on another test's leftovers.
 */
beforeEach(async () => {
  await prisma.notification.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
});
