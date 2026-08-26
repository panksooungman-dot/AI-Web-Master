import { describe, expect, it } from "vitest";
import {
  LAUNCH_REQUEST_CATALOG,
  getLaunchRequestCatalogItem,
  getRecommendedServiceIds,
} from "../../lib/launchRequests/catalog";

describe("Launch Request Catalog — lib/launchRequests/catalog.ts", () => {
  it("getLaunchRequestCatalogItem() finds an item by id and returns undefined for unknown ids", () => {
    expect(getLaunchRequestCatalogItem("domain")?.name).toBe("도메인");
    expect(getLaunchRequestCatalogItem("not-a-real-service")).toBeUndefined();
  });

  it("getRecommendedServiceIds() recommends domain-only for a generic/unmapped site type", () => {
    expect(getRecommendedServiceIds("portfolio")).toEqual(["domain"]);
    expect(getRecommendedServiceIds("landing")).toEqual(["domain"]);
    expect(getRecommendedServiceIds("not-a-real-site-type")).toEqual(["domain"]);
  });

  it("getRecommendedServiceIds() falls back to domain-only when siteType is empty/undefined", () => {
    expect(getRecommendedServiceIds("")).toEqual(["domain"]);
    expect(getRecommendedServiceIds(undefined)).toEqual(["domain"]);
  });

  it("getRecommendedServiceIds() recommends payment for shopping", () => {
    expect(getRecommendedServiceIds("shopping")).toEqual(["domain", "payment"]);
  });

  it("getRecommendedServiceIds() recommends payment + media streaming for education", () => {
    expect(getRecommendedServiceIds("education")).toEqual(["domain", "payment", "mediaStreaming"]);
  });

  it("every recommended service id in every mapping actually exists in the catalog (no stale references)", () => {
    const siteTypes = ["shopping", "education", "portfolio", "unknown"];
    for (const siteType of siteTypes) {
      for (const serviceId of getRecommendedServiceIds(siteType)) {
        expect(LAUNCH_REQUEST_CATALOG.some((item) => item.id === serviceId)).toBe(true);
      }
    }
  });
});
