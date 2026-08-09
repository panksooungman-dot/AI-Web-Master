export interface AttachmentInput {
  name: string;
  contentType: string;
  buffer: Buffer;
}

export interface StoredAttachment {
  /** 항상 완전한 URL(https:// 또는 로컬 개발용 http://localhost:PORT/...). */
  url: string;
  name: string;
  contentType: string;
  size: number;
}

export interface AttachmentStore {
  save(input: AttachmentInput): Promise<StoredAttachment>;
}
