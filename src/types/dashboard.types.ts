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
