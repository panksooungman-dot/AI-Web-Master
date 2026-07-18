import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAnthropicProvider } from "../../packages/cli/src/providers/anthropic.js";
import { createOpenAIProvider } from "../../packages/cli/src/providers/openai.js";
import { getProviderManager } from "../../packages/cli/src/providers/manager.js";
import { ProviderError } from "../../packages/cli/src/providers/types.js";

/** Builds a Response whose body streams the given raw SSE text (in one or more chunks). */
function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
  return new Response(body, { status });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of gen) {
    items.push(item);
  }
  return items;
}

describe("AI Provider — streaming chat (packages/cli/src/providers/{anthropic,openai}.ts)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("anthropic.chatStream() yields text deltas then a final done chunk with accumulated usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":12}}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
          'event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":5}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n'
        ])
      )
    );

    const provider = createAnthropicProvider({ apiKey: "sk-test" });
    const chunks = await collect(provider.chatStream!({ messages: [{ role: "user", content: "hi" }] }));

    expect(chunks).toEqual([
      { delta: "Hello", done: false, model: "claude-sonnet-5" },
      { delta: " world", done: false, model: "claude-sonnet-5" },
      { delta: "", done: true, model: "claude-sonnet-5", usage: { inputTokens: 12, outputTokens: 5 } }
    ]);
  });

  it("anthropic.chatStream() throws MISSING_API_KEY (before any fetch) when no apiKey is configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const provider = createAnthropicProvider({});
    await expect(collect(provider.chatStream!({ messages: [] }))).rejects.toMatchObject({
      code: "MISSING_API_KEY"
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("openai.chatStream() yields text deltas then a final done chunk on [DONE]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
          "data: [DONE]\n\n"
        ])
      )
    );

    const provider = createOpenAIProvider({ apiKey: "sk-test" });
    const chunks = await collect(provider.chatStream!({ messages: [{ role: "user", content: "hi" }] }));

    expect(chunks).toEqual([
      { delta: "Hel", done: false, model: "gpt-4o-mini" },
      { delta: "lo", done: false, model: "gpt-4o-mini" },
      { delta: "", done: true, model: "gpt-4o-mini" }
    ]);
  });

  it("openai.chatStream() skips malformed JSON events instead of throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse(["data: not-json\n\n", 'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n', "data: [DONE]\n\n"])
      )
    );

    const provider = createOpenAIProvider({ apiKey: "sk-test" });
    const chunks = await collect(provider.chatStream!({ messages: [] }));

    expect(chunks).toEqual([
      { delta: "ok", done: false, model: "gpt-4o-mini" },
      { delta: "", done: true, model: "gpt-4o-mini" }
    ]);
  });
});

describe("AI Provider Manager — streamComplete() (packages/cli/src/providers/manager.ts)", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "provider-stream-test-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("falls back to a single [simulated] done chunk when the resolved (default) provider is unavailable", async () => {
    // Fresh cwd → default config's "anthropic" resolves with an empty apiKey (no ANTHROPIC_API_KEY
    // in this test's env), so chatStream()/chat() throws MISSING_API_KEY and — because no explicit
    // providerId was requested — streamComplete() swallows it into a simulated fallback chunk
    // (same resolve→attempt→simulate semantics as complete()).
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const manager = getProviderManager(cwd);

    const chunks = await collect(
      manager.streamComplete({ systemPrompt: "sys", userPrompt: "hi", fallbackLabel: "Test" })
    );

    expect(chunks).toHaveLength(1);
    expect(chunks[0].done).toBe(true);
    expect(chunks[0].delta).toContain("[simulated]");
  });

  it("does NOT swallow a failure when an explicit providerId is requested — throws instead", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const manager = getProviderManager(cwd);

    const consume = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- draining the iterator, not reading values
      for await (const _chunk of manager.streamComplete({
        providerId: "anthropic",
        systemPrompt: "sys",
        userPrompt: "hi",
        fallbackLabel: "Test"
      })) {
        // drain
      }
    };

    await expect(consume()).rejects.toBeInstanceOf(ProviderError);
  });

  it("falls back to chat() (single done chunk) for a provider that does not implement chatStream (gemini)", async () => {
    const manager = getProviderManager(cwd);
    await manager.setProviderConfig("gemini", { apiKey: "sk-test" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: "hello from gemini" }] } }],
            usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 2 }
          }),
          { status: 200 }
        )
      )
    );

    const chunks = await collect(
      manager.streamComplete({
        providerId: "gemini",
        systemPrompt: "sys",
        userPrompt: "hi",
        fallbackLabel: "Test"
      })
    );

    expect(chunks).toEqual([
      {
        delta: "hello from gemini",
        done: true,
        provider: "gemini",
        model: "gemini-1.5-flash",
        usage: { inputTokens: 3, outputTokens: 2 }
      }
    ]);

    const usage = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "usage.json"), "utf-8"));
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ provider: "gemini", inputTokens: 3, outputTokens: 2, simulated: false });
  });

  it("streams multiple chunks for a provider that implements chatStream (anthropic) and records usage once, on done", async () => {
    const manager = getProviderManager(cwd);
    await manager.setProviderConfig("anthropic", { apiKey: "sk-test" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        sseResponse([
          'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":7}}}\n\n',
          'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}\n\n',
          'event: message_delta\ndata: {"type":"message_delta","usage":{"output_tokens":1}}\n\n',
          'event: message_stop\ndata: {"type":"message_stop"}\n\n'
        ])
      )
    );

    const chunks = await collect(
      manager.streamComplete({
        providerId: "anthropic",
        systemPrompt: "sys",
        userPrompt: "hi",
        fallbackLabel: "Test"
      })
    );

    expect(chunks).toEqual([
      { delta: "Hi", done: false, model: "claude-sonnet-5", provider: "anthropic" },
      {
        delta: "",
        done: true,
        model: "claude-sonnet-5",
        provider: "anthropic",
        usage: { inputTokens: 7, outputTokens: 1 }
      }
    ]);

    const usage = JSON.parse(fs.readFileSync(path.join(cwd, ".runtime", "usage.json"), "utf-8"));
    expect(usage).toHaveLength(1);
    expect(usage[0]).toMatchObject({ provider: "anthropic", model: "claude-sonnet-5", inputTokens: 7, outputTokens: 1 });
  });
});
