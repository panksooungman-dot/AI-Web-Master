import { NextResponse } from "next/server";
import { getWireframe, updateWireframeContent, type WireframeContent } from "@/lib/design/wireframe";
import { recordAuditEvent } from "@/lib/audit/log";
import { getCurrentActorEmail } from "@/lib/audit/actor";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** `content`가 `WireframeContent` 모양(layouts/components/responsive 배열·객체 존재)인지만
 *  얕게 확인한다 — 각 필드 내부까지 전부 검증하지 않는 이유는 이 값이 항상 서버가 방금
 *  내려준 레코드를 클라이언트가 그대로 들고 있다가 일부만 고쳐 보내는 것이기 때문이다
 *  (Phase 1~6의 all-or-nothing 파싱과 달리, 여기는 신뢰할 수 있는 원본을 수정한 것이라
 *  구조 자체가 깨질 일이 없다 — 형태 확인만으로 충분하다). */
function isWireframeContent(value: unknown): value is WireframeContent {
  return (
    isRecord(value) &&
    Array.isArray(value.layouts) &&
    Array.isArray(value.components) &&
    isRecord(value.responsive)
  );
}

/** docs/03_DESIGN 스펙의 `GET /api/design/wireframe/:id`. */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const record = await getWireframe(id);

  if (!record) {
    return NextResponse.json({ success: false, error: `Wireframe "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    wireframeId: record.id,
    projectId: record.planId,
    layouts: record.content.layouts,
    components: record.content.components,
    responsive: record.content.responsive,
    wireframe: record,
  });
}

/**
 * Wireframe Board(시각적 미리보기 + 기본 편집)에서 섹션 구성을 고친 뒤 저장하는 엔드포인트.
 * 관리자가 화면에서 컴포넌트 순서를 바꾸거나 추가/삭제한 결과(`content` 전체)를 그대로
 * 받아 저장한다 — 이후 Prototype/Figma/Design Sync가 이 Wireframe을 다시 읽을 때 수정된
 * 내용이 그대로 반영된다(`lib/design/prototype-document-adapter.ts` 등이
 * `wireframe.content.layouts`를 직접 참조하므로).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const content = isRecord(body) ? body.content : undefined;
  if (!isWireframeContent(content)) {
    return NextResponse.json({ success: false, error: "content(layouts/components/responsive)가 필요합니다." }, { status: 400 });
  }

  const updated = await updateWireframeContent(id, content);
  if (!updated) {
    return NextResponse.json({ success: false, error: `Wireframe "${id}"을(를) 찾을 수 없습니다.` }, { status: 404 });
  }

  const actor = await getCurrentActorEmail();
  await recordAuditEvent({
    action: "design.wireframe.edit",
    actor,
    success: true,
    detail: `Wireframe "${id}" 레이아웃 편집`,
  });

  return NextResponse.json({ success: true, wireframe: updated });
}
