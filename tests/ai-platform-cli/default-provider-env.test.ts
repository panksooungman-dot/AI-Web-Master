import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROVIDER_ENV,
  getProviderManager,
  resolveDefaultProviderId,
} from "../../packages/cli/src/providers/manager.js";

describe("AI Provider Manager — AI_DEFAULT_PROVIDER override (packages/cli/src/providers/manager.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "default-provider-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("falls back to the config default when the env var is unset", () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "");
    expect(resolveDefaultProviderId("anthropic")).toBe("anthropic");
  });

  it("returns null when neither the env var nor a config default exists", () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "");
    expect(resolveDefaultProviderId(null)).toBeNull();
  });

  it("the env var wins over the config default", () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "openai");
    expect(resolveDefaultProviderId("anthropic")).toBe("openai");
  });

  it("surrounding whitespace in the env var is ignored", () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "  gemini  ");
    expect(resolveDefaultProviderId("anthropic")).toBe("gemini");
  });

  it("an unknown provider name is ignored and warns instead of failing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "not-a-real-provider");

    expect(resolveDefaultProviderId("anthropic")).toBe("anthropic");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("not-a-real-provider");
  });

  it("getDefaultProviderId() applies the override", async () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "openrouter");
    const manager = getProviderManager(cwd);

    expect(await manager.getDefaultProviderId()).toBe("openrouter");
    // 파일에는 여전히 원래 기본값이 적혀 있다 — env는 읽기 시점의 우선순위일 뿐,
    // 디스크의 설정을 덮어쓰지 않는다.
    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "config", "providers.json"), "utf-8"));
    expect(raw.default).toBe("anthropic");
  });

  it("listProviders() marks the overridden provider as the default one", async () => {
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "gemini");
    const manager = getProviderManager(cwd);

    const providers = await manager.listProviders();
    const defaults = providers.filter((p) => p.isDefault).map((p) => p.id);

    expect(defaults).toEqual(["gemini"]);
  });

  it("setDefaultProvider() still writes to disk but warns that the env var overrides it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv(DEFAULT_PROVIDER_ENV, "openai");
    const manager = getProviderManager(cwd);

    await manager.setDefaultProvider("gemini");

    const raw = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "config", "providers.json"), "utf-8"));
    expect(raw.default).toBe("gemini");
    // 그러나 실제로 쓰이는 것은 env 쪽이다.
    expect(await manager.getDefaultProviderId()).toBe("openai");
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
