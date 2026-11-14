import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Container } from "@cnbiz/layout-primitives";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/contract/server/auth";

export const metadata = { title: "로그인" };
/** 설정 여부와 세션을 요청마다 확인하므로 빌드 시점에 굳히지 않는다. */
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  const cfg = getAuthConfig();
  if (cfg.configured && cfg.secret) {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (verifySessionToken(token, cfg.secret)) redirect("/admin");
  }

  return (
    <section className="bg-background py-20">
      <Container className="max-w-sm">
        <h1 className="text-2xl font-bold text-foreground">관리자 로그인</h1>
        <p className="mt-2 text-sm text-muted">근로계약서 관리 화면입니다. 비밀번호를 입력해 주세요.</p>
        <div className="mt-8">
          {cfg.configured ? (
            <LoginForm />
          ) : (
            <p role="alert" className="rounded-lg border border-secondary bg-secondary/30 p-4 text-sm text-foreground">
              관리자 로그인이 아직 설정되지 않았습니다. {cfg.problem}
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
