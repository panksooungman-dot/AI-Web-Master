import type { ReactNode } from "react";

interface PageHeaderProps {
  icon?: string;
  title: string;
  description?: string;
  workspaceName?: string | null;
  path?: string | null;
  actions?: ReactNode;
}

export function PageHeader({
  icon,
  title,
  description,
  workspaceName,
  path,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold">
          {icon ? `${icon} ` : ""}
          {title}
        </h1>
        {description && <p className="text-gray-400 mt-2">{description}</p>}
        {workspaceName && (
          <p className="text-sm text-blue-400 mt-1">
            Workspace: <span className="font-semibold">{workspaceName}</span>
          </p>
        )}
        {path && <p className="font-mono text-sm text-green-400 mt-1">{path}</p>}
      </div>

      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
