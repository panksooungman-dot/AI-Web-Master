import { NextResponse } from "next/server";
import {
  getInstalledPackages,
  installPackage,
  removePackage,
  searchPackages,
  updatePackage,
  type PackageType,
} from "@/lib/marketplace/registry";

interface RouteParams {
  params: Promise<{ type: string; name: string }>;
}

const VALID_TYPES: PackageType[] = ["agent", "workflow", "skill"];

function parseType(raw: string): PackageType | null {
  return VALID_TYPES.includes(raw as PackageType) ? (raw as PackageType) : null;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { type: typeParam, name: nameParam } = await params;
  const type = parseType(typeParam);
  const name = decodeURIComponent(nameParam);

  if (!type) {
    return NextResponse.json({ success: false, error: "잘못된 type입니다." }, { status: 400 });
  }

  const [searchResult, installedResult] = await Promise.all([
    searchPackages(name, type),
    getInstalledPackages(),
  ]);

  const entry = searchResult.results.find((e) => e.name === name && e.type === type);
  const installed = installedResult.installed.find((p) => p.name === name && p.type === type);

  if (!entry && !installed) {
    return NextResponse.json({ success: false, error: "패키지를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ success: true, entry, installed });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { type: typeParam, name: nameParam } = await params;
  const type = parseType(typeParam);
  const name = decodeURIComponent(nameParam);

  if (!type) {
    return NextResponse.json({ success: false, error: "잘못된 type입니다." }, { status: 400 });
  }

  const result = await installPackage(name, type);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { type: typeParam, name: nameParam } = await params;
  const type = parseType(typeParam);
  const name = decodeURIComponent(nameParam);

  if (!type) {
    return NextResponse.json({ success: false, error: "잘못된 type입니다." }, { status: 400 });
  }

  const result = await removePackage(name, type);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { type: typeParam, name: nameParam } = await params;
  const type = parseType(typeParam);
  const name = decodeURIComponent(nameParam);

  if (!type) {
    return NextResponse.json({ success: false, error: "잘못된 type입니다." }, { status: 400 });
  }

  const result = await updatePackage(name, type);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
