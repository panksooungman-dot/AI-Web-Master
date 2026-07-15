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
      className="mb-4 flex items-center justify-end gap-3 border-b border-gray-800 pb-3 text-sm"
      {...componentMarker("AuthBar", "components/auth/AuthBar.tsx")}
    >
      <span className="text-gray-400">{user.email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded px-3 py-1.5 font-semibold text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
      >
        로그아웃
      </button>
    </div>
  );
}
