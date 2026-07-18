import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  touchProjectOpened,
} from "../../lib/projects/registry";

describe("Project Manager — registry (lib/projects/registry.ts)", () => {
  let baseDir: string;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "projects-registry-test-"));
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

  it("createProject() then listProjects() round-trips the same record", () => {
    const created = createProject(input, baseDir);
    const projects = listProjects(baseDir);

    expect(projects).toHaveLength(1);
    expect(projects[0].id).toBe(created.id);
    expect(projects[0].status).toBe("Active");
    expect(projects[0].lastOpenedAt).toBeNull();
  });

  it("getProject() finds a project by id, undefined for unknown id", () => {
    const created = createProject(input, baseDir);

    expect(getProject(created.id, baseDir)?.name).toBe("Test Project");
    expect(getProject("does-not-exist", baseDir)).toBeUndefined();
  });

  it("touchProjectOpened() updates lastOpenedAt", () => {
    const created = createProject(input, baseDir);
    const touched = touchProjectOpened(created.id, baseDir);

    expect(touched?.lastOpenedAt).not.toBeNull();
  });

  it("deleteProject() removes the record and returns true; listProjects() no longer includes it", () => {
    const created = createProject(input, baseDir);

    expect(deleteProject(created.id, baseDir)).toBe(true);
    expect(listProjects(baseDir)).toHaveLength(0);
    expect(getProject(created.id, baseDir)).toBeUndefined();
  });

  it("deleteProject() returns false for an unknown id and leaves other records intact", () => {
    const created = createProject(input, baseDir);

    expect(deleteProject("does-not-exist", baseDir)).toBe(false);
    expect(listProjects(baseDir)).toHaveLength(1);
    expect(getProject(created.id, baseDir)).toBeDefined();
  });
});
