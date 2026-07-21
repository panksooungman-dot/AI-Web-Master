/**
 * AI Analysis Engine (AI Business OS Phase 2). Standalone service — does not import from
 * lib/inquiries so it stays reusable outside the Inquiry pipeline; the route handler that wires
 * it to Inquiry creation maps InquiryRecord → AIAnalysisInput (structurally compatible, no
 * conversion needed beyond picking fields).
 *
 * Phase 2 deliberately stops here: this module never produces a technical quote, feature spec,
 * or project timeline. It only judges "how complete is what we have, and what's missing" —
 * exactly what a later Phase's document generators would consume as input.
 */
export interface MissingItem {
  id: string;
  title: string;
  required: boolean;
  reason: string;
}

/** Exact shape requested by the AI Business OS Phase 2 spec — kept free of implementation
 * metadata (simulated/provider/model live on GenerateAnalysisResult in analysis.ts instead,
 * mirroring lib/design/generator.ts's GenerateDesignPlanResult convention). */
export interface AIAnalysisResult {
  completeness: number;
  missingItems: MissingItem[];
  detectedBusinessType: string;
  recommendedPages: string[];
  recommendedFunctions: string[];
  confidence: number;
  summary: string;
}

/** Subset of Inquiry fields the analysis actually needs. */
export interface AIAnalysisInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  siteType: string;
  /** 상담 내용(=Inquiry.requirements). */
  requirements: string;
  industry?: string;
  survey?: Record<string, unknown>;
  uploadedFiles?: string[];
}
