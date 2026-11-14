"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/admin/logout", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={busy}
      className="inline-flex items-center justify-center rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-secondary/40 disabled:opacity-50"
    >
      로그아웃
    </button>
  );
}
