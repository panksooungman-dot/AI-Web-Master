import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExecuteResult } from "../../lib/commandEngine/types";

const executeMock = vi.fn<(command: string, options: unknown) => Promise<ExecuteResult>>();

vi.mock("@/lib/commandEngine/engine", () => ({
  execute: (command: string, options: unknown) => executeMock(command, options)
}));

function ok(json: unknown): ExecuteResult {
  return {
    success: true,
    command: "node",
    cwd: process.cwd(),
    exitCode: 0,
    stdout: JSON.stringify(json),
    stderr: "",
    durationMs: 1
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
    error: stderr
  };
}

describe("AI Platform — dashboard-to-CLI bridge (lib/ai/bridge.ts)", () => {
  afterEach(() => {
    executeMock.mockReset();
  });

  it("chatViaCli() builds the `chat` command with --system/--provider and parses the --json stdout", async () => {
    executeMock.mockResolvedValue(
      ok({ success: true, content: "hi there", provider: "anthropic", model: "claude-sonnet-5", simulated: false, usage: { inputTokens: 3, outputTokens: 4 } })
    );

    const { chatViaCli } = await import("../../lib/ai/bridge");
    const result = await chatViaCli("hello", { system: "be nice", provider: "anthropic" });

    expect(result).toEqual({
      success: true,
      content: "hi there",
      provider: "anthropic",
      model: "claude-sonnet-5",
      simulated: false,
      usage: { inputTokens: 3, outputTokens: 4 },
      error: undefined
    });

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("chat");
    expect(command).toContain("hello");
    expect(command).toContain("--system");
    expect(command).toContain("be nice");
    expect(command).toContain("--provider");
    expect(command).toContain("anthropic");
    expect(command).toContain("--json");
  });

  it("chatViaCli() omits --system/--provider when not given", async () => {
    executeMock.mockResolvedValue(ok({ success: true, content: "x", simulated: true }));

    const { chatViaCli } = await import("../../lib/ai/bridge");
    await chatViaCli("hello");

    const [command] = executeMock.mock.calls[0];
    expect(command).not.toContain("--system");
    expect(command).not.toContain("--provider");
  });

  it("listProvidersViaCli() calls `provider list` and parses providers[]", async () => {
    const providers = [{ id: "anthropic", name: "anthropic", isDefault: true, configured: false }];
    executeMock.mockResolvedValue(ok({ success: true, providers }));

    const { listProvidersViaCli } = await import("../../lib/ai/bridge");
    const result = await listProvidersViaCli();

    expect(result).toEqual({ success: true, providers, error: undefined });

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("provider");
    expect(command).toContain("list");
  });

  it("listUsageViaCli() calls `provider usage` and parses summary + entries", async () => {
    const summary = { totalCalls: 1, totalInputTokens: 10, totalOutputTokens: 5, byProvider: {} };
    executeMock.mockResolvedValue(ok({ success: true, summary, entries: [] }));

    const { listUsageViaCli } = await import("../../lib/ai/bridge");
    const result = await listUsageViaCli();

    expect(result).toEqual({ success: true, summary, entries: [], error: undefined });

    const [command] = executeMock.mock.calls[0];
    expect(command).toContain("provider");
    expect(command).toContain("usage");
  });

  it("propagates a process-level failure (non-zero exit, non-JSON stdout) as an error", async () => {
    executeMock.mockResolvedValue(failedProcess("spawn ENOENT"));

    const { chatViaCli } = await import("../../lib/ai/bridge");
    const result = await chatViaCli("hello");

    expect(result.success).toBe(false);
    expect(result.error).toBe("spawn ENOENT");
  });

  it("propagates a CLI-level failure (valid JSON, success:false) as an error", async () => {
    executeMock.mockResolvedValue(ok({ success: false, error: "OPENAI_API_KEY is not configured." }));

    const { chatViaCli } = await import("../../lib/ai/bridge");
    const result = await chatViaCli("hello", { provider: "openai" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("OPENAI_API_KEY");
  });
});
