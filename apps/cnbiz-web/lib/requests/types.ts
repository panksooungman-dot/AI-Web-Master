export type RequestStatus = "New" | "InReview" | "Accepted" | "Rejected" | "Completed";

export const REQUEST_STATUSES: RequestStatus[] = [
  "New",
  "InReview",
  "Accepted",
  "Rejected",
  "Completed",
];

export interface ProjectRequestInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  industry: string;
  siteType: string;
  /** Checkboxes on the public form — may be empty. */
  features: string[];
  /** Free text, e.g. one URL per line. Optional. */
  referenceSites: string;
  /** Budget bucket, e.g. "500만원 미만". Empty string means "협의/미정". */
  budget: string;
  message: string;
}

export interface ProjectRequestRecord extends ProjectRequestInput {
  id: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}
