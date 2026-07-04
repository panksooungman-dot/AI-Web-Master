export interface ContactSubmissionInput {
  name: string;
  phone: string;
  email: string;
  message: string;
}

export interface ContactSubmissionRecord extends ContactSubmissionInput {
  id: string;
  submittedAt: string;
}
