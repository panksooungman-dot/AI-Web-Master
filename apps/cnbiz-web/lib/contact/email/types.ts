export interface ContactEmailPayload {
  to: string;
  from: string;
  subject: string;
  text: string;
}

export interface EmailProvider {
  send(payload: ContactEmailPayload): Promise<void>;
}
