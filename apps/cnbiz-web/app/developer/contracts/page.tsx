"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/developer/Badge";
import { Card } from "@/components/developer/Card";
import { PageHeader } from "@/components/developer/PageHeader";
import { LoadingText, StatusMessage } from "@/components/developer/StatusMessage";
import type { ContractRecord } from "@/lib/contracts/types";

interface ContractsResponse {
  contracts: ContractRecord[];
}

/**
 * 계약서 목록 — 읽기 전용 히스토리 화면. 생성은 이 페이지가 아니라 /developer/inquiries/[id]의
 * "계약서" 카드에서 수행한다(기술 견적서·기능 명세서·프로젝트 일정이 먼저 있어야 생성 가능하므로,
 * 자유 입력 폼을 별도로 두지 않는다). app/developer/{estimates,specifications,timeline}/page.tsx와
 * 완전히 동일한 패턴.
 */
export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setLoadError(null);

    fetch("/api/contracts")
      .then((res) => res.json())
      .then((json: ContractsResponse) => setContracts(json.contracts ?? []))
      .catch(() => setLoadError("계약서 목록을 불러오지 못했습니다."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    queueMicrotask(load);
  }, []);

  return (
    <div>
      <PageHeader
        icon="📄"
        title="계약서"
        description="기술 견적서·기능 명세서·프로젝트 일정을 기반으로 자동 생성된 계약서 목록입니다. 생성은 AI 의뢰 상세 화면에서 수행합니다."
        help={[
          "견적서·명세서·일정 3종이 모두 있어야 생성할 수 있습니다.",
          "생성은 'AI 의뢰 관리' 상세 화면에서 수행하며, PDF 출력·전자서명 기능은 아직 없습니다.",
        ]}
        actions={
          <button onClick={load} className="rounded bg-gray-700 hover:bg-gray-600 px-4 py-2 text-sm transition-colors">
            Refresh
          </button>
        }
      />

      {isLoading ? (
        <LoadingText />
      ) : loadError ? (
        <StatusMessage tone="error">{loadError}</StatusMessage>
      ) : contracts.length === 0 ? (
        <p className="text-gray-500">
          아직 생성된 계약서가 없습니다.{" "}
          <Link href="/developer/inquiries" className="text-blue-400 hover:underline">
            AI 의뢰 관리로 이동
          </Link>
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {contracts.map((contract) => (
            <Link key={contract.id} href={`/developer/contracts/${contract.id}`}>
              <Card className="flex flex-col sm:flex-row sm:items-center gap-3 hover:border-purple-600 transition-colors">
                <span className="font-mono text-xs text-gray-500 w-40 shrink-0">
                  {new Date(contract.createdAt).toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-white w-48 shrink-0 truncate">
                  {contract.input.companyName}
                </span>
                <Badge tone="purple">
                  {contract.result.contractAmount.amount.toLocaleString()}
                  {contract.result.contractAmount.currency}
                </Badge>
                {contract.simulated && <Badge tone="warning">Simulated</Badge>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
