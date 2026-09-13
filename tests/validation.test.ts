import { describe, expect, it } from "vitest";
import {
  createClientSchema,
  createFollowUpSchema,
  createLeadSchema,
  createProjectSchema,
  createTaskSchema,
  loginSchema,
  updateTaskSchema,
  updateLeadSchema,
} from "@/lib/validation/schemas";
import { toFieldErrors } from "@/lib/validation/common";

/**
 * Validation is the contract between the forms and the API, so it is tested
 * directly rather than only through the services.
 */

describe("form validation", () => {
  it("turns errors into a per-field map the forms can render", () => {
    const result = createLeadSchema.safeParse({
      name: "",
      company: "",
      email: "nope",
      source: "WEBSITE",
      ownerId: "",
    });

    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);

    expect(errors.name?.[0]).toBe("Contact name is required");
    expect(errors.company?.[0]).toBe("Company is required");
    expect(errors.email?.[0]).toBe("Enter a valid email address");
    expect(errors.ownerId?.[0]).toBe("Assigned to is required");
  });

  it("normalises blank optional inputs to null", () => {
    const parsed = createLeadSchema.parse({
      name: "Grace",
      company: "Halcyon",
      email: "grace@halcyon.test",
      phone: "",
      industry: "",
      notes: "",
      nextFollowUpAt: "",
      source: "WEBSITE",
      ownerId: "user-1",
    });

    expect(parsed.phone).toBeNull();
    expect(parsed.industry).toBeNull();
    expect(parsed.notes).toBeNull();
    expect(parsed.nextFollowUpAt).toBeNull();
    // Defaults fill in on create.
    expect(parsed.status).toBe("NEW");
    expect(parsed.score).toBe(50);
    expect(parsed.estimatedValue).toBe(0);
  });

  it("trims whitespace and rejects whitespace-only text", () => {
    const parsed = createClientSchema.parse({
      name: "  Northwind Interiors  ",
      contactName: "Helen",
      email: "helen@northwind.test",
      accountManagerId: "user-1",
    });
    expect(parsed.name).toBe("Northwind Interiors");

    expect(
      createClientSchema.safeParse({
        name: "   ",
        contactName: "Helen",
        email: "helen@northwind.test",
        accountManagerId: "user-1",
      }).success,
    ).toBe(false);
  });

  it("rejects out-of-range numbers", () => {
    const base = {
      name: "Grace",
      company: "Halcyon",
      email: "grace@halcyon.test",
      source: "WEBSITE",
      ownerId: "user-1",
    };

    expect(createLeadSchema.safeParse({ ...base, score: -1 }).success).toBe(false);
    expect(createLeadSchema.safeParse({ ...base, score: 101 }).success).toBe(false);
    expect(createLeadSchema.safeParse({ ...base, score: 7.5 }).success).toBe(false);
    expect(
      createLeadSchema.safeParse({ ...base, estimatedValue: -100 }).success,
    ).toBe(false);
    expect(createLeadSchema.safeParse({ ...base, score: 100 }).success).toBe(true);
  });

  it("rejects an unknown enum value", () => {
    expect(
      createTaskSchema.safeParse({ title: "Task", status: "NOT_A_STATUS" })
        .success,
    ).toBe(false);
    expect(
      createTaskSchema.safeParse({ title: "Task", priority: "WHENEVER" })
        .success,
    ).toBe(false);
  });

  it("requires a project deadline to be on or after the start date", () => {
    const base = {
      name: "Rebuild",
      clientId: "client-1",
      managerId: "user-1",
      startDate: "2026-03-01",
    };

    expect(
      createProjectSchema.safeParse({ ...base, deadline: "2026-02-01" }).success,
    ).toBe(false);
    expect(
      createProjectSchema.safeParse({ ...base, deadline: "2026-03-01" }).success,
    ).toBe(true);
    expect(
      createProjectSchema.safeParse({ ...base, deadline: "" }).success,
    ).toBe(true);

    const failed = createProjectSchema.safeParse({
      ...base,
      deadline: "2026-02-01",
    });
    expect(toFieldErrors(failed.error!).deadline?.[0]).toBe(
      "Deadline must be on or after the start date",
    );
  });

  it("requires a follow-up to be linked to a lead or a client", () => {
    const base = {
      title: "Discovery call",
      dueAt: "2026-05-01T10:00",
      ownerId: "user-1",
    };

    expect(createFollowUpSchema.safeParse(base).success).toBe(false);
    expect(
      createFollowUpSchema.safeParse({ ...base, leadId: "lead-1" }).success,
    ).toBe(true);
    expect(
      createFollowUpSchema.safeParse({ ...base, clientId: "client-1" }).success,
    ).toBe(true);
  });

  it("validates login input", () => {
    expect(
      loginSchema.safeParse({ email: "sarah@agencyflow.dev", password: "x" })
        .success,
    ).toBe(true);
    expect(
      loginSchema.safeParse({ email: "nope", password: "x" }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "" }).success,
    ).toBe(false);
  });

  describe("update schemas", () => {
    it("never re-applies create defaults on a partial update", () => {
      // Regression: `.partial()` alone keeps `.default()`, so a PATCH of one
      // field also reset status to TODO and silently reopened finished tasks.
      const parsed = updateTaskSchema.parse({ projectId: "project-2" });

      expect(parsed.projectId).toBe("project-2");
      expect("status" in parsed).toBe(false);
      expect("priority" in parsed).toBe(false);

      const lead = updateLeadSchema.parse({ notes: "Called them back." });
      expect("status" in lead).toBe(false);
      expect("score" in lead).toBe(false);
      expect("estimatedValue" in lead).toBe(false);
    });

    it("still validates the fields that are sent", () => {
      expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
      expect(
        updateLeadSchema.safeParse({ email: "not-an-email" }).success,
      ).toBe(false);
      expect(updateLeadSchema.safeParse({ score: 500 }).success).toBe(false);
      expect(updateLeadSchema.safeParse({ score: 80 }).success).toBe(true);
    });

    it("accepts an empty update", () => {
      expect(updateTaskSchema.safeParse({}).success).toBe(true);
    });
  });
});
