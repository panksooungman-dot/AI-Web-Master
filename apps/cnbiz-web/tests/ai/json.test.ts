import { describe, expect, it } from "vitest";
import { extractJsonPayload } from "../../lib/ai/json";

const PAYLOAD = { a: 1, b: "hello", c: [1, 2, 3] };
const PAYLOAD_JSON = JSON.stringify(PAYLOAD);

describe("extractJsonPayload() — lib/ai/json.ts", () => {
  it("extracts a response that is exactly one ```json fenced block (existing behavior)", () => {
    const raw = "```json\n" + PAYLOAD_JSON + "\n```";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(PAYLOAD);
  });

  it("extracts a response that is exactly one plain ``` fenced block (no json language tag)", () => {
    const raw = "```\n" + PAYLOAD_JSON + "\n```";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(PAYLOAD);
  });

  it("extracts JSON from a fenced block preceded by leading prose (real-model habit even when told not to)", () => {
    const raw = "Here is the JSON you requested:\n```json\n" + PAYLOAD_JSON + "\n```";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(PAYLOAD);
  });

  it("extracts JSON from a fenced block followed by trailing prose", () => {
    const raw = "```json\n" + PAYLOAD_JSON + "\n```\nLet me know if you need any changes!";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(PAYLOAD);
  });

  it("extracts raw JSON with no code fence at all (exact match)", () => {
    expect(JSON.parse(extractJsonPayload(PAYLOAD_JSON))).toEqual(PAYLOAD);
  });

  it("extracts raw JSON with no code fence, wrapped in leading/trailing prose", () => {
    const raw = "Sure, here you go: " + PAYLOAD_JSON + " Hope that helps!";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(PAYLOAD);
  });

  it("does not get confused by braces inside string literals when finding the balanced object", () => {
    const withBracesInString = { note: "use {curly} braces in {this} field", n: 2 };
    const raw = "prose before " + JSON.stringify(withBracesInString) + " prose after";
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(withBracesInString);
  });

  it("does not get confused by escaped quotes inside string literals", () => {
    const withEscapedQuotes = { note: 'he said \\"hi\\" to me' };
    const raw = JSON.stringify(withEscapedQuotes);
    expect(JSON.parse(extractJsonPayload(raw))).toEqual(withEscapedQuotes);
  });

  it("returns the original trimmed text unchanged when there is no JSON at all (caller's JSON.parse then fails, triggering fallback)", () => {
    const raw = "  I could not complete this request.  ";
    expect(extractJsonPayload(raw)).toBe("I could not complete this request.");
  });

  it("does not throw on truncated/malformed JSON — returns a best-effort string that still fails JSON.parse upstream", () => {
    const truncated = '{"a": 1, "b": "unterminated';
    expect(() => extractJsonPayload(truncated)).not.toThrow();
    expect(() => JSON.parse(extractJsonPayload(truncated))).toThrow();
  });
});
