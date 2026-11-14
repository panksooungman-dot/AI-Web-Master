import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Container } from "@cnbiz/layout-primitives";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/contract/server/auth";

/** 관리자 홈. 직원 계약·제출 현황 화면은 다음 단계에서 이 페이지에 연결한다. */
export default async function AdminHomePage() {
  const cfg = getAuthConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  // 서버에서 매 요청 세션을 확인한다. 클라이언트 검사에 의존하지 않는다.
  if (!cfg.configured || !cfg.secret || !verifySessionToken(token, cfg.secret)) redirect("/admin/login");

  return (
    <section className="bg-background py-20">
      <Container className="max-w-xl">
        <h1 className="text-2xl font-bold text-foreground">근로계약서 관리</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          로그인되었습니다. 직원 계약 만들기와 제출 현황 화면은 다음 단계에서 추가됩니다.
        </p>
        <div className="mt-8">
          <LogoutButton />
        </div>
      </Container>
    </section>
  );
}
