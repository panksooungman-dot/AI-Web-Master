import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenRouterProvider } from "../../packages/cli/src/providers/openrouter.js";
import { ProviderError } from "../../packages/cli/src/providers/types.js";

describe("AI Provider Manager — OpenRouter (packages/cli/src/providers/openrouter.ts)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chat() posts to the OpenAI-compatible endpoint and parses content + usage", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "hello" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 }
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const provider = createOpenRouterProvider({ apiKey: "sk-test" });
    const response = await provider.chat({ messages: [{ role: "user", content: "hi" }] });

    expect(response).toEqual({
      provider: "openrouter",
      model: "openai/gpt-4o-mini",
      content: "hello",
      usage: { inputTokens: 10, outputTokens: 5 }
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("chat() throws MISSING_API_KEY when no apiKey is configured", async () => {
    const provider = createOpenRouterProvider({});
    await expect(provider.chat({ messages: [] })).rejects.toMatchObject({ code: "MISSING_API_KEY" });
  });

  it("models() returns the id list from the /models endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: [{ id: "openai/gpt-4o-mini" }, { id: "anthropic/claude-3-haiku" }] }), {
          status: 200
        })
      )
    );

    const provider = createOpenRouterProvider({ apiKey: "sk-test" });
    const models = await provider.models();

    expect(models).toEqual(["openai/gpt-4o-mini", "anthropic/claude-3-haiku"]);
  });

  it("validate() returns true when models() succeeds, false when it fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: [] }), { status: 200 })));
    const okProvider = createOpenRouterProvider({ apiKey: "sk-test" });
    expect(await okProvider.validate()).toBe(true);

    vi.unstubAllGlobals();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const failingProvider = createOpenRouterProvider({ apiKey: "sk-test" });
    expect(await failingProvider.validate()).toBe(false);
  });

  it("chat() throws INVALID_RESPONSE when the API returns no message content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [] }), { status: 200 })));

    const provider = createOpenRouterProvider({ apiKey: "sk-test" });
    await expect(provider.chat({ messages: [] })).rejects.toBeInstanceOf(ProviderError);
  });
});
