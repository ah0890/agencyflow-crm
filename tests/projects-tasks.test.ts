import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  createProject,
  deleteProject,
  updateProject,
} from "@/server/services/projects";
import {
  createTask,
  deleteTask,
  listTasks,
  toggleTask,
  updateTask,
} from "@/server/services/tasks";
import { NotFoundError } from "@/server/errors";
import { makeClient, makeUser } from "./factories";

function projectInput(
  clientId: string,
  managerId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    name: "Website Redesign & Build",
    clientId,
    type: "WEB_DEVELOPMENT",
    status: "IN_PROGRESS",
    priority: "HIGH",
    description: "Full rebuild on a headless CMS.",
    budget: 45000,
    progress: 0,
    startDate: "2026-01-05",
    deadline: "2026-06-30",
    managerId,
    memberIds: [],
    ...overrides,
  };
}

describe("projects", () => {
  it("creates a project with a team", async () => {
    const manager = await makeUser({ name: "Manager" });
    const dev = await makeUser({ name: "Dev" });
    const designer = await makeUser({ name: "Designer" });
    const client = await makeClient(manager.id);

    const project = await createProject(
      projectInput(client.id, manager.id, {
        memberIds: [dev.id, designer.id],
      }),
      manager.id,
    );

    expect(project.name).toBe("Website Redesign & Build");
    expect(project._count.members).toBe(2);

    const activity = await prisma.activity.findFirst({
      where: { projectId: project.id },
    });
    expect(activity?.type).toBe("PROJECT_CREATED");
  });

  it("never adds the manager twice as a member", async () => {
    const manager = await makeUser();
    const dev = await makeUser();
    const client = await makeClient(manager.id);

    const project = await createProject(
      projectInput(client.id, manager.id, {
        memberIds: [manager.id, dev.id],
      }),
      manager.id,
    );

    expect(project._count.members).toBe(1);
  });

  it("rejects a deadline before the start date", async () => {
    const manager = await makeUser();
    const client = await makeClient(manager.id);

    await expect(
      createProject(
        projectInput(client.id, manager.id, {
          startDate: "2026-06-01",
          deadline: "2026-01-01",
        }),
        manager.id,
      ),
    ).rejects.toThrow();

    expect(await prisma.project.count()).toBe(0);
  });

  it("forces progress to 100 and stamps completedAt on completion", async () => {
    const manager = await makeUser();
    const client = await makeClient(manager.id);
    const project = await createProject(
      projectInput(client.id, manager.id, { progress: 40 }),
      manager.id,
    );

    const completed = await updateProject(
      project.id,
      { status: "COMPLETED" },
      manager.id,
    );

    expect(completed.progress).toBe(100);
    expect(completed.completedAt).not.toBeNull();

    // Reopening clears the completion stamp again.
    const reopened = await updateProject(
      project.id,
      { status: "IN_PROGRESS" },
      manager.id,
    );
    expect(reopened.completedAt).toBeNull();
  });

  it("replaces the team on update rather than appending", async () => {
    const manager = await makeUser();
    const a = await makeUser();
    const b = await makeUser();
    const c = await makeUser();
    const client = await makeClient(manager.id);

    const project = await createProject(
      projectInput(client.id, manager.id, { memberIds: [a.id, b.id] }),
      manager.id,
    );
    expect(project._count.members).toBe(2);

    const updated = await updateProject(
      project.id,
      { memberIds: [c.id] },
      manager.id,
    );
    expect(updated._count.members).toBe(1);

    const members = await prisma.projectMember.findMany({
      where: { projectId: project.id },
    });
    expect(members[0]?.userId).toBe(c.id);
  });

  it("removes tasks when the project is deleted", async () => {
    const manager = await makeUser();
    const client = await makeClient(manager.id);
    const project = await createProject(
      projectInput(client.id, manager.id),
      manager.id,
    );

    await createTask(
      { title: "Task one", projectId: project.id },
      manager.id,
    );

    await deleteProject(project.id, manager.id);

    expect(await prisma.project.count()).toBe(0);
    expect(await prisma.task.count()).toBe(0);
  });

  it("throws NotFoundError for an unknown project", async () => {
    const user = await makeUser();
    await expect(
      updateProject("nope", { status: "COMPLETED" }, user.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describe("tasks", () => {
  async function setupProject() {
    const manager = await makeUser();
    const client = await makeClient(manager.id);
    const project = await createProject(
      projectInput(client.id, manager.id, { progress: 0 }),
      manager.id,
    );
    return { manager, project };
  }

  it("creates a task and logs it", async () => {
    const { manager, project } = await setupProject();

    const task = await createTask(
      {
        title: "Wireframe the key templates",
        projectId: project.id,
        assigneeId: manager.id,
        priority: "HIGH",
        status: "TODO",
        dueDate: "",
      },
      manager.id,
    );

    expect(task.title).toBe("Wireframe the key templates");
    expect(task.status).toBe("TODO");
    expect(task.completedAt).toBeNull();
    expect(task.dueDate).toBeNull();

    expect(
      await prisma.activity.count({
        where: { taskId: task.id, type: "TASK_CREATED" },
      }),
    ).toBe(1);
  });

  it("rejects a task with no title", async () => {
    const { manager } = await setupProject();
    await expect(createTask({ title: "" }, manager.id)).rejects.toThrow();
  });

  it("recalculates project progress as tasks complete", async () => {
    const { manager, project } = await setupProject();

    const a = await createTask(
      { title: "A", projectId: project.id },
      manager.id,
    );
    const b = await createTask(
      { title: "B", projectId: project.id },
      manager.id,
    );
    const c = await createTask(
      { title: "C", projectId: project.id },
      manager.id,
    );
    const d = await createTask(
      { title: "D", projectId: project.id },
      manager.id,
    );

    const zero = await prisma.project.findUnique({ where: { id: project.id } });
    expect(zero?.progress).toBe(0);

    await toggleTask(a.id, manager.id);
    let current = await prisma.project.findUnique({ where: { id: project.id } });
    expect(current?.progress).toBe(25);

    await toggleTask(b.id, manager.id);
    current = await prisma.project.findUnique({ where: { id: project.id } });
    expect(current?.progress).toBe(50);

    await toggleTask(c.id, manager.id);
    await toggleTask(d.id, manager.id);
    current = await prisma.project.findUnique({ where: { id: project.id } });
    expect(current?.progress).toBe(100);

    // Reopening one pulls the bar back down.
    await toggleTask(d.id, manager.id);
    current = await prisma.project.findUnique({ where: { id: project.id } });
    expect(current?.progress).toBe(75);
  });

  it("stamps and clears completedAt, and logs TASK_COMPLETED once", async () => {
    const { manager, project } = await setupProject();
    const task = await createTask(
      { title: "Deploy to production", projectId: project.id },
      manager.id,
    );

    const done = await toggleTask(task.id, manager.id);
    expect(done.status).toBe("COMPLETED");
    expect(done.completedAt).not.toBeNull();
    expect(
      await prisma.activity.count({
        where: { taskId: task.id, type: "TASK_COMPLETED" },
      }),
    ).toBe(1);

    const reopened = await toggleTask(task.id, manager.id);
    expect(reopened.status).toBe("TODO");
    expect(reopened.completedAt).toBeNull();
  });

  it("leaves completed and cancelled projects' progress alone", async () => {
    const manager = await makeUser();
    const client = await makeClient(manager.id);
    const project = await createProject(
      projectInput(client.id, manager.id, {
        status: "CANCELLED",
        progress: 35,
      }),
      manager.id,
    );

    const task = await createTask(
      { title: "Orphaned work", projectId: project.id },
      manager.id,
    );
    await toggleTask(task.id, manager.id);

    // A cancelled project's percentage is history, not a live calculation.
    const after = await prisma.project.findUnique({ where: { id: project.id } });
    expect(after?.progress).toBe(35);
  });

  it("recalculates both projects when a task is moved", async () => {
    const manager = await makeUser();
    const client = await makeClient(manager.id);
    const from = await createProject(
      projectInput(client.id, manager.id, { name: "From" }),
      manager.id,
    );
    const to = await createProject(
      projectInput(client.id, manager.id, { name: "To" }),
      manager.id,
    );

    const stays = await createTask(
      { title: "Stays", projectId: from.id },
      manager.id,
    );
    const moves = await createTask(
      { title: "Moves", projectId: from.id },
      manager.id,
    );
    await toggleTask(moves.id, manager.id);

    // 1 of 2 done.
    let fromProject = await prisma.project.findUnique({ where: { id: from.id } });
    expect(fromProject?.progress).toBe(50);

    await updateTask(moves.id, { projectId: to.id }, manager.id);

    fromProject = await prisma.project.findUnique({ where: { id: from.id } });
    const toProject = await prisma.project.findUnique({ where: { id: to.id } });

    // "From" now has one open task; "To" has one completed task.
    expect(fromProject?.progress).toBe(0);
    expect(toProject?.progress).toBe(100);
    expect(stays.projectId).toBe(from.id);
  });

  it("filters by scope", async () => {
    const { manager, project } = await setupProject();

    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();

    await createTask(
      { title: "Overdue", projectId: project.id, dueDate: yesterday },
      manager.id,
    );
    await createTask(
      { title: "Upcoming", projectId: project.id, dueDate: tomorrow },
      manager.id,
    );
    const done = await createTask(
      { title: "Done", projectId: project.id, dueDate: yesterday },
      manager.id,
    );
    await toggleTask(done.id, manager.id);

    expect((await listTasks({ scope: "overdue" })).total).toBe(1);
    expect((await listTasks({ scope: "open" })).total).toBe(2);
    expect((await listTasks({ status: "COMPLETED" })).total).toBe(1);
    expect((await listTasks({ q: "Upcoming" })).total).toBe(1);
  });

  it("updates project progress after a task is deleted", async () => {
    const { manager, project } = await setupProject();

    const a = await createTask({ title: "A", projectId: project.id }, manager.id);
    const b = await createTask({ title: "B", projectId: project.id }, manager.id);
    await toggleTask(a.id, manager.id);
    expect(
      (await prisma.project.findUnique({ where: { id: project.id } }))?.progress,
    ).toBe(50);

    await deleteTask(b.id, manager.id);

    // Only the completed task remains, so the project reads 100%.
    expect(
      (await prisma.project.findUnique({ where: { id: project.id } }))?.progress,
    ).toBe(100);
  });
});
