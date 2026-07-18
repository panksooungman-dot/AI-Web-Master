import { afterEach, describe, expect, it, vi } from "vitest";
import { getProviderStatuses } from "../../lib/providers/status";

describe("AI Workspace — provider status (lib/providers/status.ts)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns exactly the 5 required providers with the required fields", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
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

  it("openai/gemini report 'Not Configured' with no model when their API key env vars are unset (no live call made)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetchMock = vi.fn().mockRejectedValue(new Error("should not be called"));
    vi.stubGlobal("fetch", fetchMock);

    const providers = await getProviderStatuses();
    const openai = providers.find((p) => p.id === "openai");
    const gemini = providers.find((p) => p.id === "gemini");

    expect(openai?.status).toBe("Not Configured");
    expect(openai?.model).toBeNull();
    expect(gemini?.status).toBe("Not Configured");
    expect(gemini?.model).toBeNull();

    // 키가 없으면 OpenAI/Gemini는 실제 API를 호출하지 않고 즉시 판정한다(불필요한 네트워크 호출 없음).
    const calledUrls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calledUrls.some((url) => url.includes("api.openai.com"))).toBe(false);
    expect(calledUrls.some((url) => url.includes("generativelanguage.googleapis.com"))).toBe(false);

    // Ollama의 health check는 OpenAI/Gemini의 설정 여부와 무관하게 항상(병렬로) 수행되도록
    // 의도되어 있다 — 위 두 단언과 달리 이 호출은 허용되어야 하므로, 실제로 일어났는지 긍정 검증한다.
    expect(calledUrls.some((url) => url.includes("localhost:11434"))).toBe(true);
  });

  it("openai/gemini report 'Configured' with a real model name when the live models call succeeds", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test-key");
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("api.openai.com")) {
          return Promise.resolve({ ok: true, json: async () => ({ data: [{ id: "gpt-4o-mini" }] }) });
        }
        if (url.includes("generativelanguage.googleapis.com")) {
          return Promise.resolve({ ok: true, json: async () => ({ models: [{ name: "models/gemini-1.5-flash" }] }) });
        }
        return Promise.reject(new Error("connection refused"));
      })
    );

    const providers = await getProviderStatuses();
    const openai = providers.find((p) => p.id === "openai");
    const gemini = providers.find((p) => p.id === "gemini");

    expect(openai?.status).toBe("Configured");
    expect(openai?.model).toBe("gpt-4o-mini");
    expect(gemini?.status).toBe("Configured");
    expect(gemini?.model).toBe("gemini-1.5-flash");
  });

  it("openai/gemini report 'Unreachable' (not 'Configured') when a key is set but the live call fails", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-invalid-key");
    vi.stubEnv("GEMINI_API_KEY", "invalid-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("api.openai.com") || url.includes("generativelanguage.googleapis.com")) {
          return Promise.resolve({ ok: false, status: 401, json: async () => ({}) });
        }
        return Promise.reject(new Error("connection refused"));
      })
    );

    const providers = await getProviderStatuses();
    const openai = providers.find((p) => p.id === "openai");
    const gemini = providers.find((p) => p.id === "gemini");

    expect(openai?.status).toBe("Unreachable");
    expect(openai?.model).toBeNull();
    expect(gemini?.status).toBe("Unreachable");
    expect(gemini?.model).toBeNull();
  });

  it("ollama reports 'Connected' with the first model name when the local API responds", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
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
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

    const providers = await getProviderStatuses();
    const ollama = providers.find((p) => p.id === "ollama");

    expect(ollama?.status).toBe("Unreachable");
    expect(ollama?.model).toBeNull();
  });

  it("claude-code and cursor come from the real agent registry (isAvailable-driven, not hardcoded)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
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
