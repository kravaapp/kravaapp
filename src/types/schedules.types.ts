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

export type SubscriptionStatusType = 'Confirmado' | 'ListaEspera' | 'WaitlistPending' | 'CheckedIn' | 'Faltou';

export type OccurrenceStatusType = 'Agendada' | 'Em andamento' | 'Encerrada';

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
  subscriptionStatus: SubscriptionStatusType | null
}

export type TodayOccurrenceType = {
  id: string;
  aulaId: string;
  aulaName: string;
  modalidadeName: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: OccurrenceStatusType;
  maxCapacity: number;
  confirmedCount: number;
  waitlistCount: number;
  pendingPayments: number;
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatusType | null;
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

export type MyMonthlyScheduleType = {
  totalPresencas: number;
  totalFaltas: number;
  checkInsRemainingThisMonth: number | null;
  totalUsedThisMonth: number;
  availableForSchedulingThisMonth: number | null;
  modalityId: string | null;
}