import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProviderManager } from "../../packages/cli/src/providers/manager.js";

describe("AI Provider Manager — setProviderConfig() + live validate() (packages/cli/src/providers/manager.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "provider-config-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("setProviderConfig() writes the key without touching other providers", async () => {
    const manager = getProviderManager(cwd);
    await manager.setProviderConfig("openai", { apiKey: "sk-openai-test" });

    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "config", "providers.json"), "utf-8"));

    expect(raw.providers.openai.apiKey).toBe("sk-openai-test");
    // 다른 provider(anthropic 등)의 기본 템플릿 값은 그대로 유지된다.
    expect(raw.providers.anthropic.apiKey).toBe("${ANTHROPIC_API_KEY}");
  });

  it("setProviderConfig() merges into existing config rather than replacing it", async () => {
    const manager = getProviderManager(cwd);
    await manager.setProviderConfig("ollama", { host: "http://localhost:11434" });
    await manager.setProviderConfig("openai", { apiKey: "sk-1" });

    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "config", "providers.json"), "utf-8"));

    expect(raw.providers.ollama.host).toBe("http://localhost:11434");
    expect(raw.providers.openai.apiKey).toBe("sk-1");
  });

  it("setProviderConfig() throws NOT_FOUND for an unknown provider id", async () => {
    const manager = getProviderManager(cwd);
    await expect(manager.setProviderConfig("does-not-exist", { apiKey: "x" })).rejects.toMatchObject({
      code: "NOT_FOUND"
    });
  });

  it("openai.validate() does a real live check (models()) instead of key-presence-only", async () => {
    const manager = getProviderManager(cwd);
    await manager.setProviderConfig("openai", { apiKey: "sk-test" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [{ id: "gpt-4o-mini" }] }), { status: 200 })));
    const provider = await manager.getProvider("openai");
    expect(await provider.validate()).toBe(true);

    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 })));
    const providerAfterFailure = await manager.getProvider("openai");
    expect(await providerAfterFailure.validate()).toBe(false);
  });

  it("openai.validate() returns false immediately (no fetch) when no apiKey is configured", async () => {
    // 앰비언트 환경에 OPENAI_API_KEY가 실제로 설정되어 있을 수 있으므로(예: 다른 통합 테스트용),
    // 이 테스트가 항상 "키 없음" 상태를 검증하도록 명시적으로 비워둔다.
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const manager = getProviderManager(cwd);
    const provider = await manager.getProvider("openai");

    expect(await provider.validate()).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
