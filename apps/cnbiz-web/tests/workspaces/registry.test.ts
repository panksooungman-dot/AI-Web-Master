import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFsStore } from "../../lib/db/fsStore";
import { createWorkspace, getWorkspace, listWorkspaces } from "../../lib/workspaces/registry";

describe("Workspace Registry — lib/workspaces/registry.ts", () => {
  let dataDir: string;
  let workspacesDir: string;
  let store: ReturnType<typeof createFsStore>;

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-registry-data-"));
    workspacesDir = fs.mkdtempSync(path.join(os.tmpdir(), "workspace-registry-folders-"));
    store = createFsStore(dataDir);
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(workspacesDir, { recursive: true, force: true });
  });

  it("listWorkspaces() returns an empty array before anything is created", async () => {
    expect(await listWorkspaces(store)).toEqual([]);
  });

  it("createWorkspace() creates the real folder on disk and persists a record", async () => {
    const targetPath = path.join(workspacesDir, "my-project");
    const workspace = await createWorkspace("My Project", targetPath, store);

    expect(workspace.id).toBeTruthy();
    expect(workspace.path).toBe(targetPath);
    expect(fs.existsSync(targetPath)).toBe(true);
    expect(await listWorkspaces(store)).toHaveLength(1);
  });

  it("getWorkspace() finds a record by id, undefined for unknown id", async () => {
    const workspace = await createWorkspace("My Project", path.join(workspacesDir, "a"), store);

    expect((await getWorkspace(workspace.id, store))?.name).toBe("My Project");
    expect(await getWorkspace("does-not-exist", store)).toBeUndefined();
  });

  it("listWorkspaces() drops (and persists the removal of) records whose real folder no longer exists", async () => {
    const keepPath = path.join(workspacesDir, "keep");
    const goneePath = path.join(workspacesDir, "gone");

    await createWorkspace("Keep", keepPath, store);
    await createWorkspace("Gone", goneePath, store);
    fs.rmSync(goneePath, { recursive: true, force: true });

    const result = await listWorkspaces(store);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Keep");

    // persisted, not just filtered in-memory on this call
    expect(await listWorkspaces(store)).toHaveLength(1);
  });
});
