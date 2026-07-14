import { describe, expect, it } from "vitest";
import { renderPromptContent } from "../../lib/prompts/render";

describe("Prompt Library — render (lib/prompts/render.ts, preview-only)", () => {
  it("substitutes {{key}} placeholders with the provided variable values", () => {
    const rendered = renderPromptContent("You are a copywriter for {{brand}}, targeting {{audience}}.", {
      brand: "Acme",
      audience: "developers"
    });

    expect(rendered).toBe("You are a copywriter for Acme, targeting developers.");
  });

  it("substitutes missing variables with an empty string", () => {
    const rendered = renderPromptContent("Hello {{name}}!", {});
    expect(rendered).toBe("Hello !");
  });

  it("supports repeated placeholders for the same key", () => {
    const rendered = renderPromptContent("{{x}} + {{x}} = 2{{x}}", { x: "1" });
    expect(rendered).toBe("1 + 1 = 21");
  });

  it("tolerates extra whitespace inside the braces ({{ key }})", () => {
    const rendered = renderPromptContent("{{  brand  }}", { brand: "Acme" });
    expect(rendered).toBe("Acme");
  });

  it("leaves content without placeholders unchanged", () => {
    expect(renderPromptContent("plain text", { unused: "x" })).toBe("plain text");
  });
});
