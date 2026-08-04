"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";

/**
 * components/auth/AuthBar.tsx와 동일한 useAuth() 훅을 재사용하지만(로직 재사용, AuthContext는
 * 무수정), 그 컴포넌트 자체는 재사용하지 않는다 — AuthBar의 `hover:text-white`는 /developer의
 * 어두운 배경 전제로 만들어져 있어 고객 포털의 밝은 배경에서는 호버 시 텍스트가 보이지 않게
 * 된다. AuthBar를 고치면 /developer·/projects에 영향을 주므로(수정 금지 대상), 대신 이 화면
 * 전용의 밝은 테마 버전을 별도로 둔다.
 */
export function CustomerHeaderAuth() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-500">{user.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg px-3 py-1.5 font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        로그아웃
      </button>
    </div>
  );
}
