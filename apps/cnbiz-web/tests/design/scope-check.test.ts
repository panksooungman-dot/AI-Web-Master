import { describe, expect, it } from "vitest";
import { AUTO_RUN_BATCH_LIMIT, estimateScope } from "../../lib/design/scope-check";
import type { DatabaseDesignRecord, DatabaseTable } from "../../lib/design/database-design";
import type { ApiDesignRecord, ApiEndpoint } from "../../lib/design/api-design";

function table(name: string): DatabaseTable {
  return { name, description: name, primaryKey: "id", columns: [{ name: "id", type: "uuid", nullable: false, description: "" }] };
}

function endpoint(path: string): ApiEndpoint {
  return { method: "GET", path, description: path, requiresAuth: false, requestBody: "", responseShape: "" };
}

function databaseDesign(tableCount: number): DatabaseDesignRecord {
  return {
    id: "db-1",
    planId: "plan-1",
    version: 1,
    content: {
      tables: Array.from({ length: tableCount }, (_, i) => table(`table_${i}`)),
      relationships: [],
      indexes: [],
      rlsPolicies: [],
      migrationNotes: "",
    },
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}

function apiDesign(databaseDesignId: string, endpointCount: number): ApiDesignRecord {
  return {
    id: "api-1",
    databaseDesignId,
    planId: "plan-1",
    version: 1,
    content: {
      endpoints: Array.from({ length: endpointCount }, (_, i) => endpoint(`/api/resource-${i}`)),
      authenticationStrategy: "",
      fileUploadEndpoints: [],
      apiTestNotes: "",
    },
    simulated: true,
    createdAt: new Date().toISOString(),
  };
}

describe("Design Automation — scope-check (lib/design/scope-check.ts)", () => {
  it("computes table/endpoint counts directly from the given records", () => {
    const db = databaseDesign(5);
    const api = apiDesign(db.id, 12);

    const scope = estimateScope(db, api);

    expect(scope.tableCount).toBe(5);
    expect(scope.endpointCount).toBe(12);
  });

  it("estimates remaining batch calls using the real batch-size constants (ceiling division per stage)", () => {
    // endpointCount=10 → Backend Design ceil(10/10)=1, Backend Code ceil(10/5)=2,
    // Test Plan ceil(10/8)=2, Test Code ceil(20/5)=4. tableCount=10 → Database Code ceil(10/10)=1.
    // total = 1+2+1+2+4 = 10
    const db = databaseDesign(10);
    const api = apiDesign(db.id, 10);

    const scope = estimateScope(db, api);

    expect(scope.estimatedRemainingBatchCalls).toBe(10);
  });

  it("withinAutoRunLimit is true at or below AUTO_RUN_BATCH_LIMIT, false just above it", () => {
    // 아주 작은 규모 — 명백히 상한 이내
    const small = estimateScope(databaseDesign(1), apiDesign("db-1", 1));
    expect(small.withinAutoRunLimit).toBe(true);
    expect(small.estimatedRemainingBatchCalls).toBeLessThanOrEqual(AUTO_RUN_BATCH_LIMIT);

    // 아주 큰 규모 — 명백히 상한 초과
    const large = estimateScope(databaseDesign(50), apiDesign("db-1", 200));
    expect(large.withinAutoRunLimit).toBe(false);
    expect(large.estimatedRemainingBatchCalls).toBeGreaterThan(AUTO_RUN_BATCH_LIMIT);
  });

  it("handles zero tables/endpoints without dividing by zero", () => {
    const scope = estimateScope(databaseDesign(0), apiDesign("db-1", 0));

    expect(scope.estimatedRemainingBatchCalls).toBe(0);
    expect(scope.withinAutoRunLimit).toBe(true);
  });
});
