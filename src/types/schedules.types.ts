export type ScheduleType = {
  bookingId: string;
  bookingStatus?: string;
  status?: string;
  ocorrenciaId: string;
  ocorrenciaDate: string;
  aulaId: string;
  aulaName: string;
  startTime: string;
  endTime: string;
  modalityId: string;
  modalityName: string;
  professorId: string;
  professorName: string;
  ctId: string;
  ctName: string;
  waitlistPosition: number | null;
  minLevel?: string;
  publicGender?: string;
  maxCapacity?: number;
  releaseAt?: string;
  confirmedCount?: number;
}

export type PaginatedType = {
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type ScheduleOccurrenceType = {
  id: string;
  aulaId: string;
  aulaName: string;
  modalityName: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  maxCapacity: number,
  confirmedCount: number,
  waitlistCount: number,
  allowTrial: boolean,
  releaseAt: string;
  minLevel: string;
  publicGender: string;
  waitlistTimeoutMinutes: number;
  subscriptionStatus: 'Confirmado' | 'ListaEspera' | 'WaitlistPending' | 'CheckedIn' | 'Faltou' | null
}

export type PaginatedSchedule = PaginatedType & {
  items: ScheduleOccurrenceType[];
}

export type BookingUserHistoryType = {
  bookingId: string;
  bookingStatus: string;
  ocorrenciaId: string;
  ocorrenciaDate: string;
  startTime: string;
  endTime: string;
  aulaName: string;
  modalityName: string;
  professorName: string;
  checkedInAtUtc: string | null;
}

export type PaginatedBookingUserHistory = PaginatedType & {
  items: BookingUserHistoryType[];
}
