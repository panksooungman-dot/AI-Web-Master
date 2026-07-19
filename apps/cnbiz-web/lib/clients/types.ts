/** 고객사/담당자 레코드. 재문의·재의뢰 시 같은 Client에 여러 Inquiry/Project가 누적된다. */
export interface ClientInput {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
}

export interface ClientRecord extends ClientInput {
  id: string;
  inquiryIds: string[];
  websiteOrderIds: string[];
  createdAt: string;
  updatedAt: string;
}
