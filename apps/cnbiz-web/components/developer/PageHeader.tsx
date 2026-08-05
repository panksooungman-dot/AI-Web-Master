import type { ReactNode } from "react";
import { componentMarker } from "@/lib/dev/component-marker";
import { HelpTip } from "./HelpTip";

interface PageHeaderProps {
  icon?: string;
  title: string;
  description?: string;
  /** 이 화면의 용도·다른 화면과의 연결 관계를 짧게 설명하는 항목들. 있으면 제목 옆에 "?" 도움말 버튼이 표시된다. */
  help?: string[];
  workspaceName?: string | null;
  path?: string | null;
  actions?: ReactNode;
}

export function PageHeader({
  icon,
  title,
  description,
  help,
  workspaceName,
  path,
  actions,
}: PageHeaderProps) {
  return (
    <div
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6"
      {...componentMarker("PageHeader", "components/developer/PageHeader.tsx")}
    >
      <div>
        <h1 className="text-3xl font-bold">
          {icon ? `${icon} ` : ""}
          {title}
          {help && help.length > 0 && <HelpTip items={help} />}
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
