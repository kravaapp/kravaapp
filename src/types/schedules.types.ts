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
  status: "Agendada";
  maxCapacity: number,
  confirmedCount: number,
  waitlistCount: number,
  allowTrial: boolean,
  releaseAt: string;
  minLevel: string;
  publicGender: string;
  waitlistTimeoutMinutes: number;
}

export type PaginatedSchedule = PaginatedType & {
  items: ScheduleOccurrenceType[];
}