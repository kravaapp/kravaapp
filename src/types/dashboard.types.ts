import { OccurrenceStatusType } from "./schedules.types";

export type NextClassType = {
  ocorrenciaId: string;
  aulaId: string;
  name: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  confirmedCount: number;
  waitlistCount: number;
  maxCapacity: number;
  status: OccurrenceStatusType | null;
}

export type TeacherDashboardType = {
  nextClass: NextClassType | null;
  todayClassesCount: number;
  todayStudentsCount: number;
  todayWaitlistCount: number;
}

export type ActiveStudentsType = {
  activeStudentsCount: number;
};

export type FinancialDashboardType = {
  mrr: number;
  ticketMedio: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  totalOverdueValue: number;
  delinquencyPercentage: number;
};

export type OperationalDashboardType = {
  checkInCount: number;
  noShowRate: number;
  avgCheckInFrequency: number;
  activeStudentsCount: number;
  totalStudentsCount: number;
  topModalidades: Array<{
    modalidadeName: string | null;
    bookingsCount: number;
  }> | null;
  classOccupancies: Array<{
    aulaId: string;
    aulaName: string | null;
    startTime: string;
    dayOfWeek: number;
    professorName: string | null;
    occurrencesCount: number;
    totalBookings: number;
    avgOccupancyPercentage: number;
  }> | null;
};

export type DailyAttendanceType = {
  date: string;
  checkInCount: number;
};

export type StudentAtRiskType = {
  alunoId: string;
  alunoName: string | null;
  score: number;
  level: string | null;
  evaluatedAtUtc: string;
  lastActivityDate: string | null;
  contractEndDate: string | null;
  reasons: string[] | null;
  contactedAtUtc: string | null;
  contactResult: string | null;
};

export type PartnerRequestType = {
  id: string;
  alunoId: string;
  alunoName: string | null;
  partner: string | null;
  partnerId: string | null;
  status: string | null;
  rejectionReason: string | null;
  createdAtUtc: string;
};
