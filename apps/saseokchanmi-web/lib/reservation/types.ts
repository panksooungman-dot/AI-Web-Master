export interface ReservationInput {
  name: string;
  phone: string;
  visitDate: string;
  visitTime: string;
  partySize: string;
  message?: string;
  /** 화면에는 보이지 않는 스팸 방지용 허니팟 필드. 봇이 채우면 접수를 건너뛴다. */
  company?: string;
}

export interface ReservationRecord {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  visitDate: string;
  visitTime: string;
  partySize: string;
  message: string;
}

export interface FieldErrors {
  name?: string;
  phone?: string;
  visitDate?: string;
  visitTime?: string;
  partySize?: string;
}
