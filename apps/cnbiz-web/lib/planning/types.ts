import type { AIAnalysisResult } from "@/lib/ai-analysis/types";

/**
 * Planning (AI Business OS Phase 3) — consumes the existing AI Analysis Engine's output
 * (lib/ai-analysis, unmodified) to produce three documents: Functional Specification, Technical
 * Estimate, Project Timeline. This module intentionally holds no storage logic — Planning results
 * are persisted via the existing AiJobRecord.result field (lib/aiJobs/types.ts), not a new
 * registry/collection (see lib/aiJobs/executor.ts's "generate_planning" branch).
 */
export interface PlanningInput {
  companyName: string;
  siteType: string;
  requirements: string;
  analysis: AIAnalysisResult;
}

export type SpecPriority = "High" | "Medium" | "Low";

export interface SpecPage {
  name: string;
  description: string;
}

export interface SpecFunction {
  name: string;
  description: string;
  priority: SpecPriority;
}

export interface FunctionalSpecification {
  overview: string;
  pages: SpecPage[];
  functions: SpecFunction[];
}

export interface EstimateLineItem {
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

export interface TechnicalEstimate {
  currency: string;
  lineItems: EstimateLineItem[];
  subtotal: number;
  contingency: number;
  total: number;
  assumptions: string[];
}

export interface TimelinePhase {
  name: string;
  description: string;
  durationDays: number;
  startOffsetDays: number;
}

export interface ProjectTimeline {
  phases: TimelinePhase[];
  totalDurationDays: number;
}

export interface PlanningContent {
  specification: FunctionalSpecification;
  estimate: TechnicalEstimate;
  timeline: ProjectTimeline;
}
