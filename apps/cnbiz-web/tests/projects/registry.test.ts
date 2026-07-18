import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  touchProjectOpened,
} from "../../lib/projects/registry";

describe("Project Manager — registry (lib/projects/registry.ts)", () => {
  let baseDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-registry-test-"));
    store = createFsStore(baseDir);
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  const input = {
    name: "Test Project",
    company: "CNBIZ",
    type: "Web Application",
    description: "A test project",
    workspaceId: "workspace-1",
    workspaceName: "test-workspace",
    workspacePath: "D:/Workspace/test",
  };

  it("createProject() then listProjects() round-trips the same record", async () => {
    const created = await createProject(input, store);
    const projects = await listProjects(store);

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(created.id);
    expect(projects[0].status).toBe("Active");
    expect(projects[0].lastOpenedAt).toBeNull();
  });

  it("getProject() finds a project by id, undefined for unknown id", async () => {
    const created = await createProject(input, store);

    expect((await getProject(created.id, store))?.name).toBe("Test Project");
    expect(await getProject("does-not-exist", store)).toBeUndefined();
  });

  it("touchProjectOpened() updates lastOpenedAt", async () => {
    const created = await createProject(input, store);
    const touched = await touchProjectOpened(created.id, store);

    expect(touched?.lastOpenedAt).not.toBeNull();
  });

  it("deleteProject() removes the record and returns true; listProjects() no longer includes it", async () => {
    const created = await createProject(input, store);

    expect(await deleteProject(created.id, store)).toBe(true);
    expect(await listProjects(store)).toHaveLength(0);
    expect(await getProject(created.id, store)).toBeUndefined();
  });

  it("deleteProject() returns false for an unknown id and leaves other records intact", async () => {
    const created = await createProject(input, store);

    expect(await deleteProject("does-not-exist", store)).toBe(false);
    expect(await listProjects(store)).toHaveLength(1);
    expect(await getProject(created.id, store)).toBeDefined();
  });
});
