"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { componentMarker } from "@/lib/dev/component-marker";

export function AuthBar() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (isLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="mb-4 flex min-w-0 items-center justify-between gap-3 border-b border-gray-800 pb-3 text-sm"
      {...componentMarker("AuthBar", "components/auth/AuthBar.tsx")}
    >
      <span className="min-w-0 flex-1 truncate text-gray-400">{user.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="shrink-0 rounded px-3 py-1.5 font-semibold text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
      >
        로그아웃
      </button>
    </div>
  );
}
