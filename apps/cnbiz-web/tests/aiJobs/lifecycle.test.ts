import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetPostProcessHooksForTests,
  registerPostProcessHook,
  runPostProcessHooks,
  type PostProcessContext,
} from "../../lib/aiJobs/lifecycle";

/**
 * AI Business OS 공식 Lifecycle Extension Point — 순수 메커니즘 테스트.
 * 이 파일은 어떤 구체적 운영 기능(고객 URL 전달·Slack·CRM 등)도 언급하지 않는다 —
 * 실행기 자체(등록·priority 순서·격리 실행)만 검증한다.
 */
describe("AI Job Lifecycle — registerPostProcessHook() / runPostProcessHooks()", () => {
  beforeEach(() => {
    __resetPostProcessHooksForTests();
  });

  it("runs a single registered hook with the given context", async () => {
    const calls: PostProcessContext[] = [];
    registerPostProcessHook({
      name: "hook-a",
      run: async (context) => {
        calls.push(context);
      },
    });

    await runPostProcessHooks({ jobId: "job-1" });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ jobId: "job-1" });
  });

  it("does nothing when no hooks are registered", async () => {
    await expect(runPostProcessHooks({ jobId: "job-1" })).resolves.toBeUndefined();
  });

  it("runs hooks in ascending priority order regardless of registration order", async () => {
    const order: string[] = [];
    registerPostProcessHook({ name: "low-priority-number-first", priority: 10, run: async () => { order.push("10"); } });
    registerPostProcessHook({ name: "highest-number-last", priority: 300, run: async () => { order.push("300"); } });
    registerPostProcessHook({ name: "middle", priority: 100, run: async () => { order.push("100"); } });

    await runPostProcessHooks({ jobId: "job-1" });

    expect(order).toEqual(["10", "100", "300"]);
  });

  it("defaults priority to 100 when omitted", async () => {
    const order: string[] = [];
    registerPostProcessHook({ name: "explicit-50", priority: 50, run: async () => { order.push("50"); } });
    registerPostProcessHook({ name: "default-priority", run: async () => { order.push("default"); } });
    registerPostProcessHook({ name: "explicit-150", priority: 150, run: async () => { order.push("150"); } });

    await runPostProcessHooks({ jobId: "job-1" });

    expect(order).toEqual(["50", "default", "150"]);
  });

  it("replaces (not duplicates) a hook registered again under the same name", async () => {
    let callCount = 0;
    registerPostProcessHook({ name: "hook-a", run: async () => { callCount += 1; } });
    registerPostProcessHook({ name: "hook-a", run: async () => { callCount += 100; } }); // re-registration (e.g. Hot Reload)

    await runPostProcessHooks({ jobId: "job-1" });

    expect(callCount).toBe(100); // only the latest registration ran, exactly once
  });

  it("continues running subsequent hooks even if an earlier one throws", async () => {
    const order: string[] = [];
    registerPostProcessHook({
      name: "failing-hook",
      priority: 1,
      run: async () => {
        order.push("failing-hook");
        throw new Error("boom");
      },
    });
    registerPostProcessHook({
      name: "healthy-hook",
      priority: 2,
      run: async () => {
        order.push("healthy-hook");
      },
    });

    await expect(runPostProcessHooks({ jobId: "job-1" })).resolves.toBeUndefined();
    expect(order).toEqual(["failing-hook", "healthy-hook"]);
  });

  it("passes the store through to every hook unmodified", async () => {
    const fakeStore = {} as PostProcessContext["store"];
    let received: PostProcessContext["store"];
    registerPostProcessHook({
      name: "hook-a",
      run: async (context) => {
        received = context.store;
      },
    });

    await runPostProcessHooks({ jobId: "job-1", store: fakeStore });

    expect(received).toBe(fakeStore);
  });
});
