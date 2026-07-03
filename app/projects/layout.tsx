import type { ReactNode } from "react";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-gray-950 text-white p-6">{children}</main>;
}
