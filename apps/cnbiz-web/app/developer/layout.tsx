import type { ReactNode } from "react";
import { DeveloperNav } from "@/components/developer/DeveloperNav";
import { AuthBar } from "@/components/auth/AuthBar";

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <AuthBar />
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <DeveloperNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}
