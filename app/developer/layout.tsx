import type { ReactNode } from "react";
import { DeveloperNav } from "@/components/developer/DeveloperNav";

export default function DeveloperLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <DeveloperNav />
      {children}
    </main>
  );
}
