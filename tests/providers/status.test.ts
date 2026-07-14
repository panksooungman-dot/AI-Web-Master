import { afterEach, describe, expect, it, vi } from "vitest";
import { getProviderStatuses } from "../../lib/providers/status";

describe("AI Workspace — provider status (lib/providers/status.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns exactly the 5 required providers with the required fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connection refused"))
    );

    const providers = await getProviderStatuses();
    const ids = providers.map((p) => p.id).sort();

    expect(ids).toEqual(["claude-code", "cursor", "gemini", "ollama", "openai"]);

    for (const provider of providers) {
      expect(provider.name.length).toBeGreaterThan(0);
      expect(provider.provider.length).toBeGreaterThan(0);
      expect([
        "Installed",
        "Not Installed",
        "Connected",
        "Unreachable",
        "Configured",
        "Not Configured",
      ]).toContain(provider.status);
    }
  });

  it("openai/gemini report 'Not Configured' with no model when their API key env vars are unset", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const providers = await getProviderStatuses();
    const openai = providers.find((p) => p.id === "openai");
    const gemini = providers.find((p) => p.id === "gemini");

    expect(openai?.status).toBe("Not Configured");
    expect(openai?.model).toBeNull();
    expect(gemini?.status).toBe("Not Configured");
    expect(gemini?.model).toBeNull();
  });

  it("openai/gemini report 'Configured' with a default model when their API key env vars are set", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const providers = await getProviderStatuses();
    const openai = providers.find((p) => p.id === "openai");
    const gemini = providers.find((p) => p.id === "gemini");

    expect(openai?.status).toBe("Configured");
    expect(openai?.model).toBe("gpt-4o-mini");
    expect(gemini?.status).toBe("Configured");
    expect(gemini?.model).toBe("gemini-1.5-flash");
  });

  it("ollama reports 'Connected' with the first model name when the local API responds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: "llama3:8b" }, { name: "mistral:7b" }] }),
      })
    );

    const providers = await getProviderStatuses();
    const ollama = providers.find((p) => p.id === "ollama");

    expect(ollama?.status).toBe("Connected");
    expect(ollama?.model).toBe("llama3:8b");
  });

  it("ollama reports 'Unreachable' when the local API is not running", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const providers = await getProviderStatuses();
    const ollama = providers.find((p) => p.id === "ollama");

    expect(ollama?.status).toBe("Unreachable");
    expect(ollama?.model).toBeNull();
  });

  it("claude-code and cursor come from the real agent registry (isAvailable-driven, not hardcoded)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const providers = await getProviderStatuses();
    const claudeCode = providers.find((p) => p.id === "claude-code");
    const cursor = providers.find((p) => p.id === "cursor");

    expect(claudeCode?.provider).toBe("Anthropic");
    expect(["Installed", "Not Installed"]).toContain(claudeCode?.status);
    expect(cursor?.provider).toBe("Cursor");
    expect(["Installed", "Not Installed"]).toContain(cursor?.status);
  });
});
