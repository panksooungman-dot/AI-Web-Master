import type { ReactNode } from "react";
import { AuthBar } from "@/components/auth/AuthBar";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <AuthBar />
      {children}
    </main>
  );
}
