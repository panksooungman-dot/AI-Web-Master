"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/developer/Card";
import { LoadingText } from "@/components/developer/StatusMessage";
import { componentMarker } from "@/lib/dev/component-marker";
import type { DesignPlanRecord } from "@/lib/design/types";

export function DesignPlansWidget() {
  const [plans, setPlans] = useState<DesignPlanRecord[] | null>(null);

  useEffect(() => {
    fetch("/api/design/requirements")
      .then((res) => res.json())
      .then((json: { plans: DesignPlanRecord[] }) => setPlans(json.plans ?? []))
      .catch(() => setPlans([]));
  }, []);

  return (
    <Card
      title="Design Plans"
      actions={
        <Link href="/developer/design" className="text-xs text-blue-400 hover:underline">
          전체 보기 →
        </Link>
      }
      {...componentMarker("DesignPlansWidget", "components/developer/dashboard/DesignPlansWidget.tsx")}
    >
      {plans === null ? (
        <LoadingText />
      ) : plans.length === 0 ? (
        <p className="text-sm text-gray-500">아직 생성된 Design Plan이 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Total Plans</span>
            <span className="text-gray-200">{plans.length}</span>
          </li>
          <li className="flex items-center justify-between gap-3">
            <span className="text-gray-500">Latest</span>
            <span className="text-xs text-gray-400 truncate max-w-[60%]">{plans[0]?.input.projectName}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}
