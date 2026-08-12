import { PaginatedType } from "./schedules.types";

export type AlunoSummaryType = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  phone: string;
  status: string;
  level: string;
  planoAtivo: string | null;
  paymentMethods: string[];
  modalities: string[];
  checkinsThisMonth: number;
  enrolledAtUtc: string;
};

export type PaginatedAlunos = PaginatedType & {
  items: AlunoSummaryType[];
  totalPages: number;
};
