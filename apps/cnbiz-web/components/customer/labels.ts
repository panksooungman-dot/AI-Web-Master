import type { WebsiteOrderStatus } from "@/lib/websiteOrders/types";
import type { DeploymentStatus } from "@/lib/websites/registry";
import type { ProjectStatus } from "@/lib/projects/registry";
import type { WorkflowRunStatus } from "@/lib/workflows/types";

/** Customer Portal 전용 한국어 라벨 — 개발자용 status 값을 고객이 이해하기 쉬운 문구로 바꾼다. */
export const ORDER_STATUS_LABELS: Record<WebsiteOrderStatus, string> = {
  Requested: "접수됨",
  InProgress: "진행 중",
  Review: "검수 중",
  Delivered: "납품 완료",
  Cancelled: "취소됨",
};

export const DEPLOYMENT_STATUS_LABELS: Record<DeploymentStatus, string> = {
  NotStarted: "배포 전",
  Success: "배포 완료",
  Failed: "배포 실패",
  NotConfigured: "배포 준비 중",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  Active: "진행 중",
  Paused: "일시 중지",
  Completed: "완료",
  Archived: "보관됨",
};

export const WORKFLOW_STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  Pending: "대기 중",
  Running: "실행 중",
  Paused: "일시 중지",
  Completed: "완료",
  Failed: "실패",
  Cancelled: "취소됨",
};
