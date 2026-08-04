import Link from "next/link";
import type { CustomerOrderSummary } from "@/lib/customerPortal/view";
import { ORDER_STATUS_LABELS, DEPLOYMENT_STATUS_LABELS } from "./labels";

const DOCUMENT_LABELS: Array<{ key: keyof CustomerOrderSummary; label: string }> = [
  { key: "hasAnalysis", label: "AI 분석" },
  { key: "hasEstimate", label: "견적서" },
  { key: "hasSpecification", label: "명세서" },
  { key: "hasTimeline", label: "일정" },
  { key: "hasContract", label: "계약서" },
  { key: "hasProposal", label: "제안서" },
];

export function OrderCard({ order }: { order: CustomerOrderSummary }) {
  return (
    <Link
      href={`/customer/orders/${order.websiteOrderId}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm shadow-zinc-900/5 transition-colors hover:border-zinc-300"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold text-zinc-900">{order.companyName}</h3>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>

      <p className="mb-4 text-sm text-zinc-500">
        접수일: {new Date(order.createdAt).toLocaleDateString("ko-KR")}
      </p>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {DOCUMENT_LABELS.map(({ key, label }) => (
          <span
            key={key}
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              order[key]
                ? "bg-emerald-50 text-emerald-700"
                : "bg-zinc-50 text-zinc-400"
            }`}
          >
            {label} {order[key] ? "✓" : "-"}
          </span>
        ))}
      </div>

      {order.deploymentStatus && order.deploymentStatus !== "NotStarted" && (
        <p className="text-sm text-zinc-600">
          배포 상태:{" "}
          <span className="font-semibold text-zinc-900">
            {DEPLOYMENT_STATUS_LABELS[order.deploymentStatus]}
          </span>
          {order.deploymentUrl && (
            <>
              {" · "}
              <span className="text-blue-600 underline">사이트 보기</span>
            </>
          )}
        </p>
      )}
    </Link>
  );
}
