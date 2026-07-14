import { describe, expect, it } from "vitest";
import { getAgent, listAgents } from "../../lib/agents/registry";

describe("Agent Runtime — registry (lib/agents/registry.ts)", () => {
  it("registers exactly the 3 implemented agents (shell, claude-code, cursor)", () => {
    const agents = listAgents();
    const ids = agents.map((agent) => agent.id).sort();

    expect(ids).toEqual(["claude-code", "cursor", "shell"]);
  });

  it("every registered agent exposes a name, description, isAvailable(), and run()", () => {
    for (const agent of listAgents()) {
      expect(agent.name.length, `${agent.id}.name`).toBeGreaterThan(0);
      expect(agent.description.length, `${agent.id}.description`).toBeGreaterThan(0);
      expect(typeof agent.isAvailable).toBe("function");
      expect(typeof agent.run).toBe("function");
    }
  });

  it("getAgent() looks up a known agent by id", () => {
    const shell = getAgent("shell");
    expect(shell?.id).toBe("shell");
    expect(shell?.name).toBe("Shell");
  });

  it("getAgent() returns undefined for an unknown id instead of throwing", () => {
    expect(getAgent("does-not-exist")).toBeUndefined();
  });

  it("the shell agent always reports itself as available", async () => {
    const shell = getAgent("shell");
    await expect(shell?.isAvailable()).resolves.toBe(true);
  });
});
