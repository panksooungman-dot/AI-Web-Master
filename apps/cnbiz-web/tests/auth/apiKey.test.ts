import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { verifyExternalApiKey } from "../../lib/auth/apiKey";

function requestWithKey(key: string | null): Request {
  const headers = new Headers();
  if (key !== null) headers.set("x-api-key", key);
  return new Request("https://example.com/api/external/inquiries", { headers });
}

describe("External API key — lib/auth/apiKey.ts", () => {
  const originalKey = process.env.CHATBOT_API_KEY;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.CHATBOT_API_KEY = originalKey;
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });

  describe("when CHATBOT_API_KEY is configured", () => {
    beforeEach(() => {
      process.env.CHATBOT_API_KEY = "test-secret-key";
    });

    it("accepts a request with the matching x-api-key header", () => {
      expect(verifyExternalApiKey(requestWithKey("test-secret-key"))).toBe(true);
    });

    it("rejects a request with a wrong key", () => {
      expect(verifyExternalApiKey(requestWithKey("wrong-key"))).toBe(false);
    });

    it("rejects a request with no key at all", () => {
      expect(verifyExternalApiKey(requestWithKey(null))).toBe(false);
    });

    it("rejects a key of different length without throwing (timingSafeEqual guard)", () => {
      expect(verifyExternalApiKey(requestWithKey("short"))).toBe(false);
    });
  });

  describe("when CHATBOT_API_KEY is not configured", () => {
    beforeEach(() => {
      delete process.env.CHATBOT_API_KEY;
    });

    it("fails closed in production (fail-fast, same principle as getDefaultStore())", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      expect(verifyExternalApiKey(requestWithKey(null))).toBe(false);
    });

    it("allows the request outside production (local dev convenience)", () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      expect(verifyExternalApiKey(requestWithKey(null))).toBe(true);
    });
  });
});
