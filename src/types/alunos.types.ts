import { PaginatedType } from "./schedules.types";

export type AlunoSummaryType = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  phone: string | null;
  status: string | null;
  level: string | null;
  planoAtivo: string | null;
  paymentMethods: string[] | null;
  modalities: string[] | null;
  checkinsThisMonth: number;
  enrolledAtUtc: string;
};

export type PaginatedAlunos = PaginatedType & {
  items: AlunoSummaryType[] | null;
  totalPages: number;
};

export type AlunoType = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  cpf: string | null;
  birthDate: string | null;
  phone: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  medicalNotes: string | null;
  photoUrl: string | null;
  status: string | null;
  level: string | null;
  sex: string | null;
  enrolledAtUtc: string;
  optOutReengagement: boolean;
  planoId?: string | null;
  planoName?: string | null;
  contratoStartDate?: string | null;
  contratoEndDate?: string | null;
};

export type CreateAlunoType = {
  userId: string;
  cpf: string | null;
  birthDate: string | null;
  phone: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  medicalNotes: string | null;
  sex: string | null;
};

export type UpdateAlunoType = Omit<CreateAlunoType, "userId"> & {
  photoUrl: string | null;
  status: string | null;
  optOutReengagement: boolean | null;
};

/** Dados que o próprio aluno pode atualizar no CT atualmente selecionado. */
export type UpdateAlunoMeType = Pick<
  UpdateAlunoType,
  | "cpf"
  | "birthDate"
  | "phone"
  | "emergencyContact"
  | "emergencyPhone"
  | "medicalNotes"
  | "photoUrl"
  | "sex"
>;

export type AttendanceItemType = {
  id: string;
  checkedInAt: string;
  method: string | null;
  aulaName: string | null;
  aulaDate: string;
  startTime: string | null;
};

export type AlunoHistoryType = { attendances: AttendanceItemType[] | null };
export type UpdateAlunoPaymentMethodsType = { paymentMethods: string[] | null; partnerNote: string | null };
