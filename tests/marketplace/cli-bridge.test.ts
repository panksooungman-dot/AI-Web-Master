import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "../../lib/commandEngine/types";

const executeMock = vi.fn<(command: string, options: unknown) => Promise<ExecuteResult>>();

vi.mock("@/lib/commandEngine/engine", () => ({
  execute: (command: string, options: unknown) => executeMock(command, options),
}));

function ok(json: unknown): ExecuteResult {
  return {
    success: true,
    command: "node",
    cwd: process.cwd(),
    exitCode: 0,
    stdout: JSON.stringify(json),
    stderr: "",
    durationMs: 1,
  };
}

function failedProcess(stderr: string): ExecuteResult {
  return {
    success: false,
    command: "node",
    cwd: process.cwd(),
    exitCode: 1,
    stdout: "",
    stderr,
    durationMs: 1,
    error: stderr,
  };
}

describe("Marketplace — dashboard-to-CLI bridge (lib/marketplace/registry.ts)", () => {
  afterEach(() => {
    executeMock.mockReset();
  });

  it("searchPackages() parses the CLI's --json stdout", async () => {
    const entry = {
      name: "my-agent",
      type: "agent",
      version: "1.0.0",
      description: "d",
      author: "a",
      createdAt: "x",
      publishedAt: "y",
    };
    executeMock.mockResolvedValue(ok({ success: true, results: [entry] }));

    const { searchPackages } = await import("../../lib/marketplace/registry");
    const result = await searchPackages("my", "agent");

    expect(result).toEqual({ success: true, results: [entry], error: undefined });

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("marketplace");
    expect(command).toContain("search");
    expect(command).toContain("my");
    expect(command).toContain("--type");
    expect(command).toContain("agent");
    expect(command).toContain("--json");
  });

  it("getInstalledPackages() calls `marketplace update` (list mode, no name) and parses installed[]", async () => {
    const installed = [
      {
        type: "agent",
        name: "my-agent",
        installedVersion: "1.0.0",
        latestVersion: "1.1.0",
        updateAvailable: true,
        description: "d",
        author: "a",
        dir: "/x",
      },
    ];
    executeMock.mockResolvedValue(ok({ success: true, installed }));

    const { getInstalledPackages } = await import("../../lib/marketplace/registry");
    const result = await getInstalledPackages();

    expect(result).toEqual({ success: true, installed, error: undefined });

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("update");
    expect(command).not.toContain("--all");
  });

  it("installPackage() builds the command with name and --type, parses entry/targetDir", async () => {
    executeMock.mockResolvedValue(
      ok({ success: true, entry: { name: "my-agent", type: "agent" }, targetDir: "/cwd/agents/my-agent" })
    );

    const { installPackage } = await import("../../lib/marketplace/registry");
    const result = await installPackage("my-agent", "agent");

    expect(result.success).toBe(true);
    expect(result.targetDir).toBe("/cwd/agents/my-agent");

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("install");
    expect(command).toContain("my-agent");
    expect(command).toContain("--type");
  });

  it("removePackage() reports failure with the CLI's error message", async () => {
    executeMock.mockResolvedValue(ok({ success: false, code: "NOT_FOUND", error: "Package \"x\" is not installed." }));

    const { removePackage } = await import("../../lib/marketplace/registry");
    const result = await removePackage("x");

    expect(result).toEqual({ success: false, error: 'Package "x" is not installed.' });
  });

  it("updatePackage() parses the update result", async () => {
    executeMock.mockResolvedValue(
      ok({ success: true, type: "agent", name: "my-agent", from: "1.0.0", to: "1.1.0", updated: true })
    );

    const { updatePackage } = await import("../../lib/marketplace/registry");
    const result = await updatePackage("my-agent");

    expect(result.success).toBe(true);
    expect(result.result).toMatchObject({ from: "1.0.0", to: "1.1.0", updated: true });
  });

  it("publishPackages() parses published/skipped/failed", async () => {
    executeMock.mockResolvedValue(
      ok({ success: true, published: [{ name: "a" }], skipped: [], failed: [] })
    );

    const { publishPackages } = await import("../../lib/marketplace/registry");
    const result = await publishPackages();

    expect(result.success).toBe(true);
    expect(result.outcome?.published).toHaveLength(1);
  });

  it("propagates a process-level failure (non-zero exit, non-JSON stdout) as an error", async () => {
    executeMock.mockResolvedValue(failedProcess("spawn ENOENT"));

    const { searchPackages } = await import("../../lib/marketplace/registry");
    const result = await searchPackages();

    expect(result.success).toBe(false);
    expect(result.error).toBe("spawn ENOENT");
    expect(result.results).toEqual([]);
  });

  it("propagates a CLI-level failure (valid JSON, success:false) as an error", async () => {
    executeMock.mockResolvedValue(ok({ success: false, error: "Multiple packages named \"x\" found: agent, workflow." }));

    const { installPackage } = await import("../../lib/marketplace/registry");
    const result = await installPackage("x");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Multiple packages");
  });
});
