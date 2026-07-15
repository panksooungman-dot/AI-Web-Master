import { afterEach, describe, expect, it, vi } from "vitest";
import { providerFetchJson, providerFetchSseStream } from "../../packages/cli/src/providers/provider.js";
import { ProviderError } from "../../packages/cli/src/providers/types.js";

/** Builds a Response whose body streams the given raw SSE text in one or more chunks. */
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
  return new Response(status === 200 ? body : null, { status });
}

/**
 * Simulates a real fetch() that respects AbortSignal — resolves after `delayMs`, or rejects
 * with a DOMException named "AbortError" the moment the caller's AbortController fires (exactly
 * how undici/browser fetch behaves), so `fetchJsonOnce()`'s `setTimeout(() => controller.abort())`
 * has something real to trigger against. Returns a plain implementation function usable with
 * both `vi.stubGlobal("fetch", ...)` and `vi.fn().mockImplementationOnce(...)`.
 */
function slowFetchRespectingAbort(
  delayMs: number,
  response: Response
): (url: string, init?: RequestInit) => Promise<Response> {
  return (_url: string, init?: RequestInit) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(response.clone()), delayMs);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
}

describe("AI Provider — shared retry/SSE helpers (packages/cli/src/providers/provider.ts)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("providerFetchJson() retry", () => {
    it("retries a 500 response and succeeds on the next attempt", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("server error", { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await providerFetchJson("test", "https://example.com/api", {}, 5000, {
        retries: 1,
        baseDelayMs: 1
      });

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("retries a network-level failure (fetch rejects) up to the configured attempts, then throws the last error", async () => {
      const fetchMock = vi.fn().mockRejectedValue(new TypeError("network down"));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        providerFetchJson("test", "https://example.com/api", {}, 5000, { retries: 2, baseDelayMs: 1 })
      ).rejects.toMatchObject({ code: "REQUEST_FAILED", status: undefined });

      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("does NOT retry a 401 (auth) failure — single attempt", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        providerFetchJson("test", "https://example.com/api", {}, 5000, { retries: 2, baseDelayMs: 1 })
      ).rejects.toMatchObject({ code: "REQUEST_FAILED", status: 401 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("does NOT retry a 400 (bad request) failure — single attempt", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        providerFetchJson("test", "https://example.com/api", {}, 5000, { retries: 2, baseDelayMs: 1 })
      ).rejects.toMatchObject({ code: "REQUEST_FAILED", status: 400 });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("retries a 429 (rate limit) response", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await providerFetchJson("test", "https://example.com/api", {}, 5000, {
        retries: 1,
        baseDelayMs: 1
      });

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("retries: 0 means a single attempt with no retries at all", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("server error", { status: 500 }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        providerFetchJson("test", "https://example.com/api", {}, 5000, { retries: 0, baseDelayMs: 1 })
      ).rejects.toBeInstanceOf(ProviderError);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("aborts and reports TIMEOUT when the provider never responds within timeoutMs", async () => {
      // Never resolves — the AbortController's own setTimeout(timeoutMs) must fire and reject.
      const fetchMock = vi.fn(slowFetchRespectingAbort(60_000, new Response(JSON.stringify({ ok: true }))));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        providerFetchJson("test", "https://example.com/api", {}, /* timeoutMs */ 20, { retries: 0, baseDelayMs: 1 })
      ).rejects.toMatchObject({ code: "TIMEOUT" });

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("TIMEOUT is retryable — recovers on a later attempt that responds before the timeout", async () => {
      const fetchMock = vi
        .fn()
        // 1st attempt: never responds within the 20ms timeout → TIMEOUT, retried.
        .mockImplementationOnce(
          slowFetchRespectingAbort(60_000, new Response(JSON.stringify({ ok: "never seen" })))
        )
        // 2nd attempt: responds immediately, well within the timeout.
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);

      const result = await providerFetchJson("test", "https://example.com/api", {}, /* timeoutMs */ 20, {
        retries: 1,
        baseDelayMs: 1
      });

      expect(result).toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("providerFetchSseStream()", () => {
    it("parses multi-line SSE events (event: + data:) split across arbitrary chunk boundaries", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          sseResponse([
            'event: content_block_delta\ndata: {"text":"Hel',
            'lo"}\n\n',
            'data: {"text":" world"}\n\n'
          ])
        )
      );

      const events = [];
      for await (const event of providerFetchSseStream("test", "https://example.com/stream", {})) {
        events.push(event);
      }

      expect(events).toEqual([
        { event: "content_block_delta", data: '{"text":"Hello"}' },
        { event: undefined, data: '{"text":" world"}' }
      ]);
    });

    it("retries connection establishment on a 500 before the stream starts, then streams normally", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response("server error", { status: 500 }))
        .mockResolvedValueOnce(sseResponse(["data: [DONE]\n\n"]));
      vi.stubGlobal("fetch", fetchMock);

      const events = [];
      for await (const event of providerFetchSseStream("test", "https://example.com/stream", {}, 5000, {
        retries: 1,
        baseDelayMs: 1
      })) {
        events.push(event);
      }

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(events).toEqual([{ event: undefined, data: "[DONE]" }]);
    });

    it("does NOT retry a 401 when establishing the stream connection", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
      vi.stubGlobal("fetch", fetchMock);

      const consume = async () => {
        for await (const _event of providerFetchSseStream("test", "https://example.com/stream", {}, 5000, {
          retries: 2,
          baseDelayMs: 1
        })) {
          // drain
        }
      };

      await expect(consume()).rejects.toMatchObject({ code: "REQUEST_FAILED", status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
