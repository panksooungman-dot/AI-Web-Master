"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { ProjectRecord } from "@/lib/projects/registry";

export function ProjectsWidget() {
  const [projects, setProjects] = useState<ProjectRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data: { projects: ProjectRecord[] }) => setProjects(data.projects ?? []))
      .catch(() => setProjects([]));
  }, []);

  const recent = [...(projects ?? [])]
    .sort((a, b) => (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt))
    .slice(0, 3);

  return (
    <Card
      title="Projects"
      actions={
        <Link href="/projects" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("ProjectsWidget", "components/developer/dashboard/ProjectsWidget.tsx")}
    >
      {projects === null ? (
        <LoadingText />
      ) : (
        <>
          <p className="mb-3 text-3xl font-bold">{projects.length}</p>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 프로젝트가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-gray-400">
              {recent.map((p) => (
                <li key={p.id} className="truncate">
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  );
}
