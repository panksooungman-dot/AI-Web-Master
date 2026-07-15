import { NextResponse } from "next/server";
import { getCatalogSummary, searchPackages, type PackageType } from "@/lib/marketplace/registry";

const VALID_TYPES: PackageType[] = ["agent", "workflow", "skill"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const keyword = url.searchParams.get("keyword") ?? undefined;
  const typeParam = url.searchParams.get("type");
  const type = typeParam && VALID_TYPES.includes(typeParam as PackageType) ? (typeParam as PackageType) : undefined;

  const { success, results, error } = await searchPackages(keyword, type);

  return NextResponse.json({ catalog: getCatalogSummary(), success, results, error });
}
